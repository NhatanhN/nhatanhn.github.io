/*======= document script =======*/

const views = {
    welcome: document.getElementById("welcome-screen"),
    lobby_select: document.getElementById("lobby-select"),
    game: document.getElementById("game"),
    attributions: document.getElementById("attributions")
}

function change_view(target) {
    for (let key in views) {
        views[key].style = `display: ${key == target ? "block" : "none"}`
    }
}

document.getElementById("btn-solo").onclick = (e) => {
    change_view("game")
    play_game()
}
document.getElementById("btn-lobby").onclick = (e) => {
    change_view("lobby_select")
}
document.getElementById("btn-attrib").onclick = (e) => {
    change_view("attributions")
}
document.getElementById("btn-lobby-back").onclick = (e) => {
    change_view("welcome")
}
document.getElementById("btn-attributions-back").onclick = (e) => {
    change_view("welcome")
}


/*======= client ui functions =======*/

const table_card_styles = [
    ["65%", "40%", "-45"],
    ["60%", "45%", "-45"],
    ["55%", "50%", "-45"],
    ["50%", "55%", "-45"],
    ["45%", "60%", "-45"],
    ["6px", "calc(100% - max(7.5vmin, 37.5px) - 6px)", "180"],
    ["6px", "calc(100% - max(11.25vmin, 56.25px) - 6px)", "180"],
    ["6px", "12px", "-90"],
    ["calc(6px + max(3.75vmin, 16.75px))", "12px", "-90"],
    ["calc(50% - 17.5px)", "12px", "-90"],
    ["calc(50% - max(3.75vmin, 18.75px) - 17.5px)", "12px", "-90"],
    ["calc(100% - max(7.5vmin, 37.5px) - 17.5px)", "12px", "-90"],
    ["calc(100% - max(11.25vmin, 56.25px) - 17.5px)", "12px", "-90"]
]

const table_cards = []
for (let i = 1; i <= 14; i++) {
    table_cards.push(document.getElementById(`table-card-${i}`))
}
const client_cards = [document.getElementById("hand-1"), document.getElementById("hand-2")]
const community_cards = []

for (let i = 1; i <= 5; i++) {
    community_cards.push(document.getElementById(`flop-${i}`))
}

const player_portrait = ["g-p1", "g-p2", "g-p3", "g-p4"].map(id => document.getElementById(id))

const btn = {
    ready: document.getElementById("decision-ready"),
    check: document.getElementById("decision-check"),
    bet: document.getElementById("decision-bet"),
    call: document.getElementById("decision-call"),
    raise: document.getElementById("decision-raise"),
    fold: document.getElementById("decision-fold")
}

const input_e = document.querySelector("#bet-select>input")

function toggle_modal(visible) {
    const modal = document.getElementById("bet-select")
    if (visible) {
        modal.style.opacity = 1
        modal.style.pointerEvents = ""
    } else {
        modal.style.opacity = 0
        modal.style.pointerEvents = "none"
    }
}
[btn.raise, btn.bet].forEach(e => e.addEventListener("click", () => {
    document.querySelector("#bet-select>div").innerText = "Select your bet:"
    toggle_modal(true)
}))
document.getElementById("bet-select-back").addEventListener("click", () => {
    toggle_modal(false)
})

input_e.addEventListener("input", (e) => {
    document.querySelector("#bet-select>div").innerText = input_e.value
})

function set_card_display(card, value, show_always = false) {
    card.innerHTML = ""
    if (value == "") {
        card.style.backgroundImage = ""
        card.style.backgroundColor = ""
    }

    if (show_always) {
        card.style.backgroundImage = "none"
        card.style.backgroundColor = "azure"
    }

    let topleft = document.createElement("p")
    let bottomright = document.createElement("p")
    let suit_text
    switch (value.charAt(0)) {
        case "d":
            suit_text = "♦"
            topleft.style.color = "firebrick"
            bottomright.style.color = "firebrick"
            break
        case "h":
            suit_text = "♥"
            topleft.style.color = "firebrick"
            bottomright.style.color = "firebrick"
            break
        case "c":
            suit_text = "♣"
            break
        case "s":
            suit_text = "♠"
            break
    }

    topleft.append(suit_text, document.createElement("br"), value.substring(1))
    bottomright.append(suit_text, document.createElement("br"), value.substring(1))
    card.append(topleft, bottomright)
}

function update_toasts(toast1msg, toast2msg) {
    const toast = document.getElementById("g-toast")
    const toast2 = document.getElementById("g-toast-2")
    if (toast1msg != null) {
        toast.innerText = toast1msg
    }
    if (toast2msg != null) {
        toast2.innerText = toast2msg
        toast2.style.display = "block"
        const animation = toast2.getAnimations()[0]

        if (animation) {
            animation.cancel()
            animation.play()
        }
    }
}

function set_active_player_portrait(player_idx) {
    for (let i = 0; i < player_portrait.length; i++) {
        if (i == player_idx) {
            player_portrait[i].classList.add("current-turn")
        } else {
            player_portrait[i].classList.remove("current-turn")
        }
    }
}

function set_player_info(player_id, message, default_format = null) {
    const display_elmnts = ["#g-p1>div", "#g-p2>div", "#g-p3>div", "#g-p4>div"]
        .map(q => document.querySelector(q))

    if (default_format != null) {
        display_elmnts[player_id].innerText =
            `money: ${default_format.money}\n\namount bet this round: ${default_format.cur_round_bet}`
    } else {
        display_elmnts[player_id].innerText = message
    }
}

/*======= game =======*/

const event_buffer = []
let c_resolve = null
let c_resolve_internal = null
async function play_game(ws = null, player_info = null) {
    console.log("client: entered")

    /*=======Main Loop =======*/
    document.getElementById("btn-leave").onclick = (e) => {
        change_view("welcome")
        signal({ message: "exit" })
    }


    /*=======Game State =======*/
    // each handler locks this mutex, which allows only one handler to execute at a time
    const mutex = new Mutex()
    const c_state = {
        hand: null,
        players: player_info,
        community_cards: null,
        pots: null,
        round: null,
        blind: null
    }
    // id of the client
    // c_state.players[client_id] represents the client's player state
    let client_id
    let exit_flag = false
    let gameover = false

    // starts local server if not connected to web socket server
    if (ws == null) {
        start_local_server()
        client_id = 0
    }

    // sends ready message to server before beginning event loop
    let input = await get_player_input(["ready"])
    send({ message: input })

    while (true) {
        let res = JSON.parse(await receive())

        if (res.message == "exit") {
            exit_flag = true
            send({ message: "exit" })
            reset_board()
            console.log("client exited")
            return
        }

        if (gameover) {
            signal({ message: "exit" })
            continue
        }

        switch (res.message) {
            case "move":
                handle_move(ws)
                break
            case "update bet":
                handle_update_bet(res.state)
                break
            case "preflop":
                handle_preflop(res.state)
                break
            case "flop":
                handle_flop(res.state)
                break
            case "turn":
                handle_turn(res.state)
                break
            case "river":
                handle_river(res.state)
                break
            case "showdown":
                handle_showdown(res.state)
                break
            case "round end":
                handle_round_end(res.state)
        }
    }

    /*=======Helper Functions=======*/

    async function get_player_input(input_types) {
        return new Promise(resolve => {
            Object.keys(btn).forEach(type => {
                if (input_types.includes(type)) {
                    btn[type].style.display = ""
                }
            })

            function btn_event_handler(str) {
                return (e) => {
                    Object.values(btn).forEach(button => {
                        button.onclick = ""
                        button.style.display = "none"
                        resolve(str)
                    })
                    document.getElementById("bet-select-confirm").onclick = ""
                }
            }

            btn.ready.onclick = btn_event_handler("ready")
            btn.check.onclick = btn_event_handler("check")
            btn.call.onclick = btn_event_handler("call")
            btn.fold.onclick = btn_event_handler("fold"); // 🥀
            [btn.bet, btn.raise].forEach(e => {
                e.onclick = (e) => {
                    const player = c_state.players[client_id]
                    const max = player.money
                    input_e.setAttribute("max", max)
                    input_e.setAttribute("min", c_state.round.pot - player.cur_round_bet)
                    input_e.value = 1
                }
            })
            document.getElementById("bet-select-confirm").onclick = (e) => {
                const player = c_state.players[client_id]
                Object.values(btn).forEach(e => {
                    e.onclick = ""
                    e.style.display = "none"
                })

                resolve(input_e.value - (c_state.round.pot - player.cur_round_bet))
                toggle_modal(false)
            }
        })
    }


    function reset_round() {
        c_state.players.forEach(player => {
            player.cur_round_bet = 0
            player.folded = false
        })
        c_state.round = { pot: 0, bet_amt: 0 }
        update_toasts(`round bets total: ${c_state.round.pot}\n\nbet to match: ${c_state.round.bet_amt}`)
    }


    async function handle_move(ws = null) {
        const release_lock = await mutex.acquire_lock()

        if (ws) { } else {
            const available_actions = ["fold"]
            if (c_state.round.bet_amt - c_state.players[client_id].cur_round_bet == 0) {
                available_actions.push("check")
                available_actions.push("bet")
            } else {
                available_actions.push("call")
                available_actions.push("raise")
            }
            const input = await get_player_input(available_actions)

            let toast2msg
            if (Number.isNaN(parseInt(input))) {
                toast2msg = `${map_id_to_name(client_id)} bet ${input}`
            } else {
                toast2msg = `${map_id_to_name(client_id)} ${input}ed`
            }
            update_toasts(`round bets total:  ${c_state.round.pot}\n\nbet to match: ${c_state.round.bet_amt}`, toast2msg)
            send({ message: input })
        }

        release_lock()
    }


    async function handle_update_bet(state) {
        const release_lock = await mutex.acquire_lock()

        const { player_id, folded, checked, called, bet, next_player } = state
        const player = c_state.players[player_id]

        let toast2msg
        if (folded) {
            player.folded = true
            player_portrait[player_id].className = "folded"
            toast2msg = `${map_id_to_name(player_id)} folded`
        } else if (checked) {
            toast2msg = `${map_id_to_name(player_id)} checked`
        } else if (called != null) {
            player.money -= called
            player.cur_round_bet += called
            c_state.round.pot += called
            toast2msg = `${map_id_to_name(player_id)} called`
            set_player_info(player_id, null, { money: player.money, cur_round_bet: player.cur_round_bet })
        } else if (bet != null) {
            player.money -= bet
            player.cur_round_bet += bet
            c_state.round.pot += bet
            c_state.round.bet_amt = player.cur_round_bet
            toast2msg = `${map_id_to_name(player_id)} bet ${bet}`
            set_player_info(player_id, null, { money: player.money, cur_round_bet: player.cur_round_bet })
        }
        update_toasts(`round bets total: ${c_state.round.pot}\n\nbet to match: ${c_state.round.bet_amt}`, toast2msg)
        set_active_player_portrait(next_player)

        release_lock()
    }


    async function handle_preflop(state) {
        const release_lock = await mutex.acquire_lock()

        for (let i = 0; i < 8; i++) {
            let [bottom, right, deg] = table_card_styles[i + 5]
            table_cards[i + 6].style.bottom = bottom
            table_cards[i + 6].style.right = right
            table_cards[i + 6].style.transform = `rotate(${deg}deg)`
        }

        c_state.hand = state.hand
        c_state.round = state.round
        c_state.players = state.players
        c_state.blind = state.blind
        c_state.starting_turn = state.starting_turn

        c_state.players.forEach((p, id) => {
            set_player_info(id, null, { money: p.money, cur_round_bet: p.cur_round_bet })
        })

        if (c_state.hand.length == 2) {
            set_card_display(client_cards[0], c_state.hand[0])
            set_card_display(client_cards[1], c_state.hand[1])
        }
        document.getElementById("g-hand").style.opacity = 1
        update_toasts(`pot: ${c_state.round.pot}\n\nbet to match: ${c_state.round.bet_amt}`)
        set_active_player_portrait(state.current_turn)

        release_lock()
    }


    async function handle_flop(state) {
        const release_lock = await mutex.acquire_lock()

        reset_round(state)
        set_active_player_portrait(c_state.starting_turn)
        c_state.community_cards = state.community_cards

        for (let i = 0; i < state.community_cards.length; i++) {
            let [bottom, right, deg] = table_card_styles[i]
            table_cards[i + 1].style.bottom = bottom
            table_cards[i + 1].style.right = right
            table_cards[i + 1].style.transform = `rotate(${deg}deg)`
            set_card_display(table_cards[i + 1], state.community_cards[i], true)
            community_cards[i].style.display = "block"
            set_card_display(community_cards[i], state.community_cards[i], true)
            document.getElementById("g-flop").style.opacity = 1
        }

        release_lock()
    }


    async function handle_turn(state) {
        const release_lock = await mutex.acquire_lock()

        reset_round(state)
        set_active_player_portrait(c_state.starting_turn)
        const { turn_card } = state
        let [bottom, right, deg] = table_card_styles[3]
        table_cards[4].style.bottom = bottom
        table_cards[4].style.right = right
        table_cards[4].style.transform = `rotate(${deg}deg)`
        set_card_display(table_cards[4], turn_card, true)
        community_cards[3].style.display = "block"
        set_card_display(community_cards[3], turn_card, true)

        release_lock()
    }


    async function handle_river(state) {
        const release_lock = await mutex.acquire_lock()

        reset_round(state)
        set_active_player_portrait(c_state.starting_turn)
        const { turn_card } = state
        let [bottom, right, deg] = table_card_styles[4]
        table_cards[5].style.bottom = bottom
        table_cards[5].style.right = right
        table_cards[5].style.transform = `rotate(${deg}deg)`
        set_card_display(table_cards[5], turn_card, true)
        community_cards[4].style.display = "block"
        set_card_display(community_cards[4], turn_card, true)

        release_lock()
    }


    async function handle_showdown(state) {
        const release_lock = await mutex.acquire_lock()

        const { hand, winnings } = state
        for (let i = 0; i < 8; i++) {
            set_card_display(table_cards[i + 6], hand[Math.floor(i / 2.1)][i % 2], true)
        }

        player_portrait.forEach((e, i) => {
            e.className = winnings[i] > 0 ? "winner" : ""
        })

        let text = []
        winnings.forEach((winning, i) => {
            if (winning > 0) {
                text.push(`${map_id_to_name(i)} +${winning.toFixed(2)}`)
                c_state.players[i].money += winning
            }
        })

        update_toasts(null, text.join("\n"))
        c_state.players.forEach((p, i) => {
            set_player_info(i, null, { money: p.money, cur_round_bet: p.cur_round_bet })
        })

        if (state.gameover) {
            gameover = true
            const { winner } = state
            update_toasts(`${map_id_to_name(winner)} has won`, "game over")
        } else {
            await awaittoast(null, 6000)
            await awaittoast("starting new match in...", 1500)
            await awaittoast("starting new match in 3", 1500)
            await awaittoast("starting new match in 2", 1500)
            await awaittoast("starting new match in 1", 1500)
            if (!exit_flag) reset_board()
        }

        release_lock()
    }


    async function handle_round_end(state) {
        const release_lock = await mutex.acquire_lock()

        const { winner } = state
        c_state.players[winner].money += c_state.round.pot
        c_state.players.forEach((p, i) => {
            set_player_info(i, null, { money: p.money, cur_round_bet: p.cur_round_bet })
        })
        player_portrait[winner].className = "winner"
        if (state.gameover) {
            gameover = true
            update_toasts(`${map_id_to_name(winner)} has won`, "game over")
        } else {
            update_toasts(null, `${map_id_to_name(winner)} +${c_state.round.pot}`)
            await awaittoast(null, 6000)
            await awaittoast("starting new match in...", 1500)
            await awaittoast("starting new match in 3", 1500)
            await awaittoast("starting new match in 2", 1500)
            await awaittoast("starting new match in 1", 1500)
            if (!exit_flag) reset_board()
        }

        release_lock()
    }


    function reset_board() {
        table_cards.forEach(tc => {
            tc.style = ""
            tc.innerHTML = ""
        })
        client_cards.forEach(cc => {
            cc.style = ""
            cc.innerHTML = ""
        })
        community_cards.forEach(cc => {
            cc.style = "display: none"
            cc.innerHTML = ""
        })

        initial_state = {
            hand: null,
            community_cards: null,
            pots: null,
            round: null,
            blind: null
        }
        Object.keys(initial_state).forEach(key => {
            c_state[key] = initial_state[key]
        })

        document.getElementById("g-hand").style = ""
        document.getElementById("g-flop").style = ""
        update_toasts("", "")

        player_portrait.forEach(e => {
            e.className = ""
        })

        Object.values(btn).forEach(b => {
            b.onclick = ""
            b.style.display = "none"
        })

        if (exit_flag) {
            event_buffer.length = 0
            c_resolve = null
            c_resolve_internal = null
        }
    }


    function map_id_to_name(id) {
        switch (id) {
            case 0: return "cat"
            case 1: return "crow"
            case 2: return "dog"
            case 3: return "mouse"
        }
    }


    function send(message, ws = null) {
        if (ws) {
            // todo
        } else {
            if (l_resolve) {
                l_resolve(JSON.stringify(message))
                l_resolve = null
            } else {
                ls_buffer.push(JSON.stringify(message))
            }
        }
    }


    async function awaittoast(message, time) {
        return new Promise(resolve => {
            if (message && !exit_flag) update_toasts(null, message)
            setTimeout(() => { resolve() }, time)
        })
    }


    async function receive() {
        if (event_buffer.length > 0) {
            let t = event_buffer.shift()
            return t
        } else {
            return new Promise(resolve => {
                const local_resolve_wrapper = (msg) => {
                    resolve(msg)
                    c_resolve = null
                    c_resolve_internal = null
                }
                c_resolve = local_resolve_wrapper
                c_resolve_internal = local_resolve_wrapper
            })
        }
    }


    function signal(message) {
        if (c_resolve_internal) {
            c_resolve_internal(JSON.stringify(message))
        } else {
            event_buffer.push(JSON.stringify(message))
        }
    }
}

class Mutex {
    constructor(max_concurrency = 1) {
        this.max_concurrency = max_concurrency
        this.active_locks = 0
        this.resolve_q = []
    }

    acquire_lock() {
        return new Promise(resolve => {
            if (this.active_locks < this.max_concurrency) {
                this.active_locks += 1
                resolve(this._create_release())
            } else {
                this.resolve_q.push(resolve)
            }
        })
    }

    _create_release() {
        let invoked = false

        return () => {
            if (invoked) return
            invoked = true

            this.active_locks -= 1

            if (this.resolve_q.length > 0) {
                const resolve = this.resolve_q.shift()
                resolve(this._create_release())
            }
        }
    }
}