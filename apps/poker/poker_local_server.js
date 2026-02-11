const ls_buffer = []
let l_resolve = null
let l_resolve_internal = null
async function start_local_server() {
    console.log("server: hello world")

    // wait for client to send ready message
    while (JSON.parse(await receive()).message != "ready") { }
    signal({ message: "phase end" })

    // server state
    const blind_amt = 10
    const s_state = {
        players: [
            { money: 100, hand: [], cur_round_bet: 0, folded: false },
            { money: 100, hand: [], cur_round_bet: 0, folded: false },
            { money: 100, hand: [], cur_round_bet: 0, folded: false },
            { money: 100, hand: [], cur_round_bet: 0, folded: false },
        ],
        community_cards: [],
        pots: [],
        round: { pot: 0, bet_amt: 0 },
        blind: 3,
        deck: new_deck(),
        phase: "preflop",
        starting_turn: 0
    }
    const msg_queue = new MessageQueue()
    const mutex = new Mutex()

    while (true) {
        let msg = JSON.parse(await receive())

        // end game if exit message is received
        if (msg.message == "exit") {
            ls_buffer.length = 0
            l_resolve = null
            l_resolve_internal = null
            console.log("local server exited")
            return
        }

        if (msg.message == "phase end") {
            switch (s_state.phase) {
                case "preflop":
                    setup_preflop()
                    break
                case "flop":
                    setup_flop()
                    break
                case "turn":
                    setup_turn()
                    break
                case "river":
                    setup_river()
                    break
                case "showdown":
                    setup_showdown()
                    break
                case "round end":
                    handle_round_end()
                    break
            }
        } else {
            msg_queue.push(msg)
        }
    }


    async function setup_preflop() {
        const release_lock = await mutex.acquire_lock()

        s_state.players.forEach(p => {
            if (!p.folded) {
                p.hand = [s_state.deck.pop(), s_state.deck.pop()]
            }
        })

        place_bet(s_state.blind, blind_amt)
        const preflop_message = {
            message: "preflop",
            state: {
                hand: s_state.players[0].hand,
                round: s_state.round,
                blind: s_state.blind,
                players: s_state.players.map(x => { return { ...x, hand: null } }),
                starting_turn: s_state.starting_turn
            }
        }
        send(preflop_message)

        s_state.phase = await begin_betting_round() ? "round end" : "flop"
        signal({ message: "phase end" })

        release_lock()
    }


    async function setup_flop() {
        const release_lock = await mutex.acquire_lock()

        s_state.community_cards = [s_state.deck.pop(), s_state.deck.pop(), s_state.deck.pop()]
        const flop_message = {
            message: "flop",
            state: { community_cards: s_state.community_cards }
        }
        send(flop_message)

        s_state.phase = await begin_betting_round() ? "round end" : "turn"
        signal({ message: "phase end" })

        release_lock()
    }


    async function setup_turn() {
        const release_lock = await mutex.acquire_lock()

        s_state.community_cards.push(s_state.deck.pop())
        const turn_message = {
            message: "turn",
            state: {
                turn_card: s_state.community_cards[s_state.community_cards.length - 1]
            }
        }
        send(turn_message)

        s_state.phase = await begin_betting_round() ? "round end" : "river"
        signal({ message: "phase end" })

        release_lock()
    }


    async function setup_river() {
        const release_lock = await mutex.acquire_lock()

        s_state.community_cards.push(s_state.deck.pop())
        const river_message = {
            message: "river",
            state: {
                turn_card: s_state.community_cards[s_state.community_cards.length - 1]
            }
        }
        send(river_message)

        s_state.phase = await begin_betting_round() ? "round end" : "showdown"
        signal({ message: "phase end" })

        release_lock()
    }


    async function setup_showdown() {
        const release_lock = await mutex.acquire_lock()

        const { players, community_cards, pots } = s_state
        const hand_strength = players.map((p) => calc_hand_strength(p.hand, community_cards))
        const winnings = (new Array(players.length)).fill(0)

        pots.forEach(pot => {
            const eligible_players = pot.contributors.filter(player_id => !players[player_id].folded)

            let winners = [eligible_players[0]]
            let highest_strength = hand_strength[eligible_players[0]]

            for (let i = 1; i < eligible_players.length; i++) {
                const p = eligible_players[i]

                if (hand_strength[p] > highest_strength) {
                    highest_strength = hand_strength[p]
                    winners = [p]
                } else if (hand_strength[p] == highest_strength) {
                    winners.push(p)
                }
            }

            const split_earnings = pot.amount / winners.length
            winners.forEach(player_id => {
                players[player_id].money += split_earnings
                winnings[player_id] += split_earnings
            })
            console.log(`winners: ${winners.map(id => id_to_name(id))}`)
        })

        const showdown_message = {
            message: "showdown",
            state: {
                hand: players.map(p => p.hand),
                winnings
            }
        }


        const only_one_player_has_any_money = players.filter(p => p.money > 0).length == 1

        if (only_one_player_has_any_money) {
            showdown_message.state = {
                ...showdown_message.state,
                gameover: true,
                winner: players.findIndex(p => p.money > 0)
            }

            signal({ message: "exit" })
        } else {
            s_state.phase = "round end"
            signal({ message: "phase end" })
        }
        send(showdown_message)

        release_lock()
    }


    async function handle_round_end() {
        const release_lock = await mutex.acquire_lock()

        s_state.blind = get_player_after_blind()
        s_state.starting_turn = get_player_after_blind()

        // reset game state
        const initial_state = {
            community_cards: [],
            pots: [],
            round: { pot: 0, bet_amt: 0 },
            deck: new_deck(),
            phase: "preflop"
        }

        Object.keys(initial_state).forEach(key => {
            s_state[key] = initial_state[key]
        })

        s_state.players.forEach(p => {
            p.folded = p.money == 0
            p.hand = []
        })

        await wait(14000)
        signal({ message: "phase end" })

        release_lock()
    }

    async function begin_betting_round() {
        await gather_bets()
        await wait(1600)

        const pots = calculate_pots()
        merge_with_existing_pots(pots)


        return should_end_round_early()

        /*=======Helper Functions=======*/
        async function gather_bets() {
            let turncount = 0
            const players = s_state.players

            while (should_continue_to_bet() || turncount < players.length) {
                const player_id = (s_state.starting_turn + turncount) % players.length
                const p = players[player_id]

                if (p.folded || p.money == 0) {
                    turncount += 1
                    continue
                }

                // delay time between moves
                await wait(1500)

                const move = await request_move(player_id)
                send({ message: "update bet", state: act(player_id, move) })

                await wait(2500)

                const everyone_folded = players.filter(p => !p.folded).length == 1
                const no_players_with_actions_left = players.filter(p => !p.folded && p.money > 0).length == 0

                if (everyone_folded || no_players_with_actions_left) {
                    break
                }

                turncount += 1
            }
        }

        function should_continue_to_bet() {
            return !s_state.players
                .filter(p => !p.folded && p.money > 0)
                .every(p => p.cur_round_bet == s_state.round.bet_amt)
        }

        async function request_move(player_id) {
            if (player_id == 0) {
                send({ message: "move" })
                return (await msg_queue.pull()).message
            }

            const { money, hand, cur_round_bet } = s_state.players[player_id]
            const hand_strength = calc_hand_strength(s_state.community_cards, hand)
            const actions = ["fold"]

            if (s_state.round.bet_amt - cur_round_bet == 0) {
                actions.push("check")
                actions.push("bet")
            } else {
                actions.push("call")
                actions.push("raise")
            }

            let message = null

            let rand = Math.random()
            if (rand < .1) {
                message = actions.includes("check") ? "check" : "fold"
            } else if (rand < .6) {
                message = actions.includes("check") ? "check"
                    : hand_strength > 1.2 ? "call"
                        : "fold"
            } else if (rand < .8) {
                message = actions.includes("check") ? "check" : "call"
            } else {
                const available_to_raise = money - (s_state.round.bet_amt - cur_round_bet)
                if (available_to_raise <= 0) {
                    message = "call"
                } else {
                    let factor = Math.random() * (hand_strength > 1.2 ? Math.random() : 1)
                    const bet = Math.floor(.8 * factor * available_to_raise)
                    message = bet == 0 ? 1 : bet
                }
            }

            return message
        }

        function act(player_id, action) {
            const player = s_state.players[player_id]
            let next_player = (player_id + 1) % s_state.players.length
            while (s_state.players[next_player].folded) {
                next_player = (next_player + 1) % s_state.players.length
            }

            switch (action) {
                case "fold": {
                    player.folded = true
                    console.log(`${id_to_name(player_id)} folded`)
                    return { player_id, folded: true, next_player }
                }
                case "check": {
                    console.log(`${id_to_name(player_id)} checked`)
                    return { player_id, checked: true, next_player }
                }
                case "call": {
                    const amt = s_state.round.bet_amt - player.cur_round_bet
                    place_bet(player_id, amt)
                    console.log(`${id_to_name(player_id)} called for ${amt}`)
                    return { player_id, called: amt, next_player }
                }
                default: {
                    const amt = s_state.round.bet_amt - player.cur_round_bet + parseInt(action)
                    place_bet(player_id, amt)
                    console.log(`${id_to_name(player_id)} bet or raised for ${amt}`)
                    return { player_id, bet: amt, next_player }
                }
            }
        }

        function calculate_pots() {
            const pots = []
            const betters = []
            s_state.players.forEach((p, player_id) => {
                if (p.cur_round_bet > 0) betters.push([p.cur_round_bet, player_id])
            })

            betters.sort((a, b) => a[0] - b[0])
            if (betters.length == 0) return pots

            let pot = { contributors: [], amount: 0 }
            for (let i = 0; i < betters.length - 1; i++) {
                const [bet_amt, b_id] = betters[i]
                pot.contributors.push(b_id)
                pot.amount += bet_amt

                const [next_bet_amt, next_b_id] = betters[i + 1]
                if (next_bet_amt > bet_amt && !s_state.players[b_id].folded) {
                    pots.push(pot)
                    pot = { contributors: [], amount: 0 }
                    for (let j = i + 1; j < betters.length; j++) {
                        betters[j][0] -= bet_amt
                    }
                }
            }
            pot.contributors.push(betters[betters.length - 1][1])
            pot.amount += betters[betters.length - 1][0]
            pots.push(pot)

            return pots
        }

        function merge_with_existing_pots() {
            pots.forEach(pot => {
                const matching_pot_idx = s_state.pots.findIndex(matching_pot => {
                    return pot.contributors.every(id => matching_pot.contributors.includes(id))
                })

                if (matching_pot_idx == -1) {
                    s_state.pots.push(pot)
                } else {
                    s_state.pots[matching_pot_idx].amount += pot.amount
                }
            })
        }

        function should_end_round_early() {
            // reset betting round state
            const pot_amt = s_state.round.pot
            s_state.round = { pot: 0, bet_amt: 0 }
            s_state.players.forEach(player => {
                player.cur_round_bet = 0
            })

            const players = s_state.players
            const folded_players = players.filter(p => p.folded)
            if (folded_players.length != players.length - 1) return false

            const winner_id = players.findIndex(p => !p.folded)
            players[winner_id].money += pot_amt
            const round_end_message = {
                message: "round end",
                state: { winner: winner_id }
            }

            console.log(`${id_to_name(winner_id)} won the round`)
            const only_one_player_has_any_money = players.filter(p => p.money > 0).length == 1

            if (only_one_player_has_any_money) {
                round_end_message.state = {
                    ...round_end_message.state,
                    gameover: true,
                }

                signal("exit")
            }

            send(round_end_message)
            return true
        }

    }


    function new_deck() {
        function shuffle(arr) {
            return arr
                .map(value => ({ value, sort: Math.random() }))
                .sort((a, b) => a.sort - b.sort)
                .map(({ value }) => value)
        }

        let value = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
        let suit = ["d", "h", "c", "s"]
        let deck = []
        suit.forEach(s => {
            value.forEach(v => {
                deck.push(s + v)
            })
        })

        return shuffle(deck)
    }


    function place_bet(player_id, amount) {
        const player = s_state.players[player_id]
        player.money -= amount
        player.cur_round_bet += amount
        s_state.round.pot += amount
        s_state.round.bet_amt = Math.max(s_state.round.bet_amt, player.cur_round_bet)
    }


    function calc_hand_strength(hand, cc) {
        // 1 -> 9: pair, two pair, 3 of a kind, straight, flush, full house, 4kind, straight flush, royal flush
        // .1 -> .13: high card values (aces high)

        const ranks = (new Array(13)).fill(0)
        const suits = { d: 0, h: 0, c: 0, s: 0 }
        const cards = [...hand, ...cc]

        cards.forEach(card => {
            suits[card.charAt(0)] += 1
            let rank = card.substring(1)
            rank = rank == "A" ? 0
                : rank == "J" ? 10
                    : rank == "Q" ? 11
                        : rank == "K" ? 12
                            : parseInt(rank) - 1

            ranks[rank] += 1
        })

        // check straight flush
        let straightflush = {
            is_flush: false,
            is_straight: false,
            highcard: -1
        }
        let sf_suits = {
            d: [],
            h: [],
            c: [],
            s: []
        }
        cards.forEach(card => {
            let rank = card.substring(1)
            rank = rank == "A" ? 0
                : rank == "J" ? 10
                    : rank == "Q" ? 11
                        : rank == "K" ? 12
                            : parseInt(rank)
            sf_suits[card.charAt(0)].push(rank)
        })
        Object.values(sf_suits).forEach(suit => {
            if (suit.length < 5) return
            straightflush.is_flush = true
            for (let i = 9; i >= 0; i--) {
                if (suit.includes(i)
                    && suit.includes(i + 1)
                    && suit.includes(i + 2)
                    && suit.includes(i + 3)
                    && suit.includes((i + 4) % 13)) {
                    straightflush.is_straight = true
                    straightflush.highcard = i == 0 ? i : (i + 4) % 13
                    break
                }

            }
        })

        if (straightflush.is_flush && straightflush.is_straight) {
            // if the highcard in the straight is an ace, then is royal flush
            if (straightflush.highcard == 0) {
                return 9.13
            }

            // if it's not, then return straight flush strength
            return 8 + map_hc_value(straightflush.highcard)
        }


        // check 4 of a kind
        // loops from rank 0 -> 12 -> 11 -> ... -> 1
        for (let i = 0; i != 1; i = i == 0 ? ranks.length - 1 : i - 1) {
            if (ranks[i] >= 4) return 7 + map_hc_value(i) + map_hc_value(find_highcard(cards, [i])) * .01
        }

        // check full house
        let fullhouse = { three: -1, pair: -1 }
        for (let i = 0; i < ranks.length; i++) {
            if (ranks[i] >= 3) {
                fullhouse.three = i
                if (i == 0) break
            }
        }

        for (let i = 0; i < ranks.length; i++) {
            if (ranks[i] >= 2 && i != fullhouse.three) {
                fullhouse.pair = i
                if (i == 0) break
            }
        }

        if (fullhouse.three != -1 && fullhouse.pair != -1) {
            return 6 + map_hc_value(fullhouse.three) + map_hc_value(fullhouse.pair) * .01
        }

        // flush
        if (straightflush.is_flush) {
            let suit = Object.keys(sf_suits).filter(key => sf_suits[key].length >= 5)
            let flush = sf_suits[suit].sort((a, b) => a - b)
            return 5 + map_hc_value(flush[0] == 0 ? 0 : flush[flush.length - 1])
        }

        // straight
        for (let i = 9; i >= 0; i--) {
            if (ranks[i] && ranks[i + 1] && ranks[i + 2] && ranks[i + 3] && ranks[(i + 4) % 13]) {
                return 4 + map_hc_value(i == 0 ? 0 : (i + 4) % 13)
            }
        }

        // 3 of a kind
        for (let i = 0; i != 1; i = i == 0 ? ranks.length - 1 : i - 1) {
            if (ranks[i] >= 3) {
                return 3 + map_hc_value(i) + map_hc_value(find_highcard(cards, [i])) * .01
            }
        }

        // twopair
        let twopair = []
        for (let i = 0; i < ranks.length; i++) {
            if (ranks[i] >= 2) {
                twopair[0] = i
                if (i == 0) break
            }
        }
        for (let i = 0; i < ranks.length; i++) {
            if (ranks[i] >= 2 && i != twopair[0]) {
                twopair[1] = i
                if (i == 0) break
            }
        }

        if (twopair.length == 2) {
            return 2
                + map_hc_value(twopair[0])
                + map_hc_value(twopair[1]) * .01
                + map_hc_value(find_highcard(cards, [twopair[0], twopair[1]])) * .0001
        }

        // pair
        for (let i = 0; i != 1; i = i == 0 ? ranks.length - 1 : i - 1) {
            if (ranks[i] >= 2) {
                return 1 + map_hc_value(i) + map_hc_value(find_highcard(cards, [i])) * .01
            }
        }

        // highcard
        return map_hc_value(find_highcard(cards))

        function map_hc_value(v) {
            if (v == 0) return .13
            return v * .01
        }

        function find_highcard(cards, exclude_values = []) {
            for (let i = 0; i != 1; i = i == 0 ? ranks.length - 1 : i - 1) {
                if (ranks[i] >= 1 && !exclude_values.includes(i)) {
                    return i
                }
            }
        }
    }


    function get_player_after_blind() {
        const blind = s_state.blind
        const num_players = s_state.players.length

        for (let i = 1; i < num_players; i++) {
            const player = s_state.players[(blind + i) % num_players]

            if (player.money > 0) return (blind + i) % num_players
        }
    }


    function id_to_name(id) {
        switch (id) {
            case 0:
                return "cat"
            case 1:
                return "crow"
            case 2:
                return "dog"
            case 3:
                return "mouse"
            default:
                return "unknown id"
        }
    }


    function send(message) {
        if (c_resolve) {
            c_resolve(JSON.stringify(message))
            c_resolve = null
        } else {
            event_buffer.push(JSON.stringify(message))
        }
    }


    function wait(ms) {
        return new Promise(resolve => {
            setTimeout(() => resolve(), ms)
        })
    }


    async function receive() {
        if (ls_buffer.length > 0) {
            return ls_buffer.shift()
        } else {
            return new Promise(resolve => {
                const local_resolve_wrapper = (msg) => {
                    resolve(msg)
                    l_resolve = null
                    l_resolve_internal = null
                }
                l_resolve = local_resolve_wrapper
                l_resolve_internal = local_resolve_wrapper
            })
        }
    }


    function signal(message) {
        if (l_resolve_internal) {
            l_resolve_internal(JSON.stringify(message))
        } else {
            ls_buffer.push(JSON.stringify(message))
        }
    }
}

class MessageQueue {
    constructor() {
        this.message_q = []
        this.resolver = null
    }

    /**
     * Adds a message to the message queue
     * 
     * @param {*} message 
     */
    push(message) {
        if (this.resolver != null) {
            this.resolver(message)
            this.resolver = null
        } else {
            this.message_q.push(message)
        }
    }

    /**
     * Removes and returns the first message of the queue
     * @returns 
     */
    async pull() {
        if (this.message_q.length > 0)
            return this.message_q.shift(0)

        return new Promise(resolve => {
            this.resolver = resolve
        })
    }
}