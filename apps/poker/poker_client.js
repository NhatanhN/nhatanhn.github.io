/*======= Type Definitions =======*/

/**
 * @typedef {Object} ClientGameState Represents the client's poker game state
 * @property {Player[]} players The players of the game
 * @property {Number} pot_total Represents the total amount of money in the pot for the match
 * @property {Round} current_round Represents the current round of poker
 */

/**
 * @typedef {Object} Player Holds information representing one player of a poker game
 * @property {Number} money Value for the amount of money a player has
 * @property {Number} round_bet Value for how much the player has bet in the current round of poker
 * @property {boolean} folded Represents if a player has folded or not
 */

/**
 * @typedef {Object} Round Represents a round of poker
 * @property {Number} bet Value of the bet that needs to be matched on calls
 * @property {Number} value Total amount of money bet so far
 */

/*======= Client UI Functions =======*/
const table_card_styles = [
	["65%", "40%", "-45deg"],
	["60%", "45%", "-45deg"],
	["55%", "50%", "-45deg"],
	["50%", "55%", "-45deg"],
	["45%", "60%", "-45deg"],
	["6px", "calc(100% - max(7.5vmin, 37.5px) - 6px)", "180deg"],
	["6px", "calc(100% - max(11.25vmin, 56.25px) - 6px)", "180deg"],
	["6px", "12px", "-90deg"],
	["calc(6px + max(3.75vmin, 16.75px))", "12px", "-90deg"],
	["calc(50% - 17.5px)", "12px", "-90deg"],
	["calc(50% - max(3.75vmin, 18.75px) - 17.5px)", "12px", "-90deg"],
	["calc(100% - max(7.5vmin, 37.5px) - 17.5px)", "12px", "-90deg"],
	["calc(100% - max(11.25vmin, 56.25px) - 17.5px)", "12px", "-90deg"],
];

const table_cards = [];
const client_cards = ["hand-1", "hand-2"].map((id) => document.getElementById(id));
const community_cards = [];
const player_portrait = ["g-p1", "g-p2", "g-p3", "g-p4"].map((id) => document.getElementById(id));
const bet_input = document.querySelector("#bet-select>input");

for (let i = 1; i <= 14; i++) {
	table_cards.push(document.getElementById(`table-card-${i}`));
}

for (let i = 1; i <= 5; i++) {
	community_cards.push(document.getElementById(`flop-${i}`));
}

const btn = {
	check: document.getElementById("decision-check"),
	bet: document.getElementById("decision-bet"),
	call: document.getElementById("decision-call"),
	raise: document.getElementById("decision-raise"),
	fold: document.getElementById("decision-fold"),
};

function toggle_modal(visible) {
	const modal = document.getElementById("bet-select");
	if (visible) {
		modal.style.opacity = 1;
		modal.style.pointerEvents = "";
	} else {
		modal.style.opacity = 0;
		modal.style.pointerEvents = "none";
	}
}

[btn.raise, btn.bet].forEach((e) =>
	e.addEventListener("click", () => {
		document.querySelector("#bet-select>div").innerText = "Select your bet:";
		toggle_modal(true);
	}),
);

["bet-select-back", "bet-select-confirm"].forEach((id) => {
	document.getElementById(id).addEventListener("click", (e) => toggle_modal(false));
});

bet_input.addEventListener("input", (e) => {
	document.querySelector("#bet-select>div").innerText = bet_input.value;
});

function set_card_display(card, value, show_always = false) {
	card.innerHTML = "";
	if (value == "") {
		card.style.backgroundImage = "";
		card.style.backgroundColor = "";
		return;
	}

	if (show_always) {
		card.style.backgroundImage = "none";
		card.style.backgroundColor = "azure";
	}

	let topleft = document.createElement("p");
	let bottomright = document.createElement("p");
	let suit_text;
	switch (value.charAt(0)) {
		case "d":
			suit_text = "♦";
			topleft.style.color = "firebrick";
			bottomright.style.color = "firebrick";
			break;
		case "h":
			suit_text = "♥";
			topleft.style.color = "firebrick";
			bottomright.style.color = "firebrick";
			break;
		case "c":
			suit_text = "♣";
			break;
		case "s":
			suit_text = "♠";
			break;
	}

	topleft.append(suit_text, document.createElement("br"), value.substring(1));
	bottomright.append(suit_text, document.createElement("br"), value.substring(1));
	card.append(topleft, bottomright);
}

function set_toast1_text(msg, show = true) {
	const toast = document.getElementById("g-toast");

	if (!show) {
		toast.style.display = "none";
		return;
	}

	toast.style.display = "block";
	toast.innerText = msg;
}

function set_toast2_text(msg, show = true) {
	const toast = document.getElementById("g-toast-2");

	if (!show) {
		toast.style.display = "none";
		return;
	}

	toast.style.display = "block";
	toast.innerText = msg;
	const animation = toast.getAnimations()[0];
	animation.cancel();
	animation.play();
}

function change_portrait(idx, image, show = true) {
	portrait = player_portrait[idx];
	img = portrait.querySelector("img");
	p = portrait.querySelector("p");

	switch (image) {
		case "cat":
			img.src = "./assets/cat.svg";
			p.innerText = idx == 0 ? "You" : "cat";
			break;
		case "crow":
			img.src = "./assets/crow.svg";
			p.innerText = idx == 0 ? "You" : "crow";
			break;
		case "dog":
			img.src = "./assets/dog.svg";
			p.innerText = idx == 0 ? "You" : "dog";
			break;
		case "mouse":
			img.src = "./assets/mouse.svg";
			p.innerText = idx == 0 ? "You" : "mouse";
			break;
	}

	portrait.style.opacity = show ? "" : 0;
}

function change_portrait_indicator(player_id, indicator, client_id) {
	player_id = (player_id + (4 - client_id)) % 4;

	if (indicator == "active") {
		for (let i = 0; i < player_portrait.length; i++) {
			if (i == player_id) {
				player_portrait[i].className = "current-turn";
			} else {
				player_portrait[i].classList.remove("current-turn");
			}
		}
	} else if (indicator == "folded") {
		player_portrait[player_id].className = "folded";
	} else if (indicator == "winner") {
		player_portrait[player_id].className = "winner";
	} else if (indicator == "none") {
		player_portrait[player_id].className = "";
	}
}

function change_player_info_panel(player_id, money, bet_amount, client_id) {
	player_id = (player_id + (4 - client_id)) % 4;

	const display_elmnts = ["#g-p1>div", "#g-p2>div", "#g-p3>div", "#g-p4>div"].map((q) => document.querySelector(q));

	display_elmnts[player_id].innerText = `Money: ${money}\n\nRound bet amount: ${bet_amount}`;
}

function set_game_over_modal(msg, show = true) {
	const modal = document.getElementById("g-game-over");
	const p = modal.querySelector("p");

	modal.style = show ? "" : "opacity: 0; display: none;";
	p.innerText = msg;
}

/*======= Game Logic =======*/

/**
 * Function to run the poker game execution UI changes
 */
async function play_game(ws = null) {
	const msg_q = new AsyncQueue();
	const is_single_player_game = ws == null;

	if (is_single_player_game) {
		run_local_server();
	} else {
		ws.onmessage = (e) => {
			msg_q.push(e.data);
		};
		ws.send(JSON.stringify({ message: "join" }));
	}

	/** @type {ClientGameState} */
	const cgs = {
		players: [],
		pot_total: 0,
		current_round: { bet: 0, value: 0 },
	};
	let client_id;
	let exit_flag = false;
	let raise_interrupt;

	const btn_leave = document.getElementById("btn-leave");
	btn_leave.onclick = (e) => {
		// reset ui
		reset_board(true);

		// change view from game to lobby
		change_view("lobby_select");
		query_lobbies();

		// signal this function to exit
		msg_q.push(JSON.stringify({ exit: true }));
		raise_interrupt();

		// unbind this event listener
		btn_leave.onclick = "";
	};

	while (true) {
		data = await msg_q.get();
		msg = JSON.parse(data);

		if (msg.exit) {
			exit_flag = true;
			return;
		}

		await Promise.race([process_message(msg), interrupt()]);
	}

	function interrupt() {
		return new Promise((resolve) => {
			raise_interrupt = resolve;
		});
	}

	async function process_message(msg) {
		switch (msg.message) {
			case "player welcome":
				handle_player_welcome(msg);
				break;
			case "player joined":
				handle_player_joined(msg);
				break;
			case "preflop":
				handle_preflop(msg);
				break;
			case "flop":
				await handle_flop(msg);
				break;
			case "turn":
				await handle_turn(msg);
				break;
			case "river":
				await handle_river(msg);
				break;
			case "showdown":
				await handle_showdown(msg);
				break;
			case "early round end":
				await handle_early_round_end(msg);
				break;
			case "disconnect":
				handle_disconnect(msg);
				break;
			case "move":
				await handle_move();
				break;
			case "move rejected":
				await handle_move_rejected(msg);
				break;
			case "update bet":
				handle_update_bet(msg);
				break;
			case "game over":
				handle_game_over(msg);
				break;
			case "server failure":
				handle_server_failure();
				break;
		}
	}

	function handle_player_welcome(msg) {
		client_id = msg.player_id;
	}

	function handle_player_joined(msg) {
		const animal = ["cat", "crow", "dog", "mouse"];

		for (let i = cgs.players.length; i < msg.player_id + 1; i++) {
			cgs.players[i] = {
				money: 100,
				hand: [],
				round_bet: 0,
				folded: false,
			};

			change_portrait((i + (4 - client_id)) % 4, animal[i]);
			change_player_info_panel(i, 100, 0, client_id);
		}

		set_toast2_text(`${animal[msg.player_id]} joined the game`);
	}

	function handle_preflop(msg) {
		const { hand, blind, blind_bet, turn } = msg;

		cgs.players[blind].money -= blind_bet;
		cgs.players[blind].round_bet += blind_bet;
		cgs.pot_total = cgs.current_round.bet = cgs.current_round.value = blind_bet;

		cgs.players.forEach((p, i) => change_player_info_panel(i, p.money, p.round_bet, client_id));
		set_toast1_text(
			`Total Pot Amount: ${cgs.pot_total}\n\n` +
				`Current Round:\nValue: ${cgs.current_round.value}\n\n` +
				`Bet to Match: ${cgs.current_round.bet}`,
		);

		for (let i = 0; i < 8; i++) {
			const card = table_cards[i + 6];
			const [bottom, right, deg] = table_card_styles[i + 5];
			card.style.bottom = bottom;
			card.style.right = right;
			card.style.transform = `rotate(${deg})`;
		}

		set_card_display(document.getElementById("hand-1"), hand[0]);
		set_card_display(document.getElementById("hand-2"), hand[1]);
		document.getElementById("g-hand").style.opacity = "";

		change_portrait_indicator(turn, "active", client_id);
	}

	async function handle_flop(msg) {
		const cc = msg.community_cards;
		const turn = msg.turn;
		reset_round();

		for (let i = 0; i < cc.length; i++) {
			const tc = table_cards[i + 1];
			const [bottom, right, deg] = table_card_styles[i];
			tc.style.bottom = bottom;
			tc.style.right = right;
			tc.style.transform = `rotate(${deg})`;

			const card = community_cards[i];
			card.style.display = "block";
			set_card_display(tc, cc[i], true);
			set_card_display(card, cc[i], true);
		}

		document.getElementById("g-flop").style.opacity = "";

		if (one_player_not_folded()) {
			change_portrait_indicator(turn, "active", client_id);
			set_toast1_text(
				`Total Pot Amount: ${cgs.pot_total}\n\n` +
					`Current Round:\nValue: ${cgs.current_round.value}\n\n` +
					`Bet to Match: ${cgs.current_round.bet}`,
			);
		}

		await cancelable_wait_then_exec(2000, null);
	}

	async function handle_turn(msg) {
		const { next_card, turn } = msg;
		reset_round();

		const [bottom, right, deg] = table_card_styles[3];
		table_cards[4].style.bottom = bottom;
		table_cards[4].style.right = right;
		table_cards[4].style.transform = `rotate(${deg})`;
		community_cards[3].style.display = "block";
		set_card_display(community_cards[3], next_card, true);
		set_card_display(table_cards[4], next_card, true);

		if (one_player_not_folded()) {
			change_portrait_indicator(turn, "active", client_id);
			set_toast1_text(
				`Total Pot Amount: ${cgs.pot_total}\n\n` +
					`Current Round:\nValue: ${cgs.current_round.value}\n\n` +
					`Bet to Match: ${cgs.current_round.bet}`,
			);
		}

		await cancelable_wait_then_exec(2000, null);
	}

	async function handle_river(msg) {
		const { next_card, turn } = msg;
		reset_round();

		const [bottom, right, deg] = table_card_styles[4];
		table_cards[5].style.bottom = bottom;
		table_cards[5].style.right = right;
		table_cards[5].style.transform = `rotate(${deg})`;
		community_cards[4].style.display = "block";
		set_card_display(community_cards[4], next_card, true);
		set_card_display(table_cards[5], next_card, true);

		if (one_player_not_folded()) {
			change_portrait_indicator(turn, "active", client_id);
			set_toast1_text(
				`Total Pot Amount: ${cgs.pot_total}\n\n` +
					`Current Round:\n Value:${cgs.current_round.value}\n\n` +
					`Bet to Match: ${cgs.current_round.bet}`,
			);
		}

		await cancelable_wait_then_exec(3000, null);
	}

	async function handle_showdown(msg) {
		const { hands, winnings } = msg;
		reset_round();
		for (let i = 0; i < winnings.length; i++) {
			cgs.players[i].money += winnings[i];
		}

		// reveal cards
		for (let i = 0; i < 8; i++) {
			set_card_display(table_cards[i + 6], hands[i], true);
		}

		// update player portraits to reflect winners
		winnings.forEach((amount, i) => {
			if (amount > 0) change_portrait_indicator(i, "winner", client_id);
		});

		// update toasts to show winning amounts
		const text = [];
		winnings.forEach((amount, i) => {
			if (amount > 0) text.push(`${id_to_name(i)} won ${amount.toFixed(2)}`);
		});
		set_toast2_text(text.join("\n"));

		// update player info to reflect winning amounts
		cgs.players.forEach((p, i) => change_player_info_panel(i, p.money, 0, client_id));

		// wait for some time before beginning next round
		await cancelable_wait_then_exec(6000, () => {});
		await cancelable_wait_then_exec(1500, () => set_toast2_text("starting new match in..."));
		await cancelable_wait_then_exec(1500, () => set_toast2_text("starting new match in 3"));
		await cancelable_wait_then_exec(1500, () => set_toast2_text("starting new match in 2"));
		await cancelable_wait_then_exec(1500, () => set_toast2_text("starting new match in 1"));
		await cancelable_wait_then_exec(1000, () => reset_board());
	}

	async function handle_early_round_end(msg) {
		const { winner, amount } = msg;
		reset_round();
		cgs.players[winner].money += amount;

		player_portrait[winner].className = "winner";
		cgs.players.forEach((p, i) => change_player_info_panel(i, p.money, 0, client_id));

		await cancelable_wait_then_exec(6000, () => {});
		await cancelable_wait_then_exec(1500, () => set_toast2_text("starting new match in..."));
		await cancelable_wait_then_exec(1500, () => set_toast2_text("starting new match in 3"));
		await cancelable_wait_then_exec(1500, () => set_toast2_text("starting new match in 2"));
		await cancelable_wait_then_exec(1500, () => set_toast2_text("starting new match in 1"));
		await cancelable_wait_then_exec(1000, () => reset_board());
	}

	function handle_disconnect(msg) {
		const { player_id, next_player } = msg;
		cgs.players[player_id].folded = true;
		cgs.players[player_id].money = 0;
		change_portrait_indicator(player_id, "folded", client_id);

		if (cgs.players.filter((p) => !p.folded).length == 1) {
			msg_q.push(JSON.stringify({ exit: true }));
			exit_game("No other players remaining");
		} else if (next_player) {
			change_portrait_indicator(next_player, "active", client_id);
		}
	}

	async function handle_move() {
		// defer the ui updates to when the "update bet" message is received and respective handler is called

		const available_actions = ["fold"];
		const max_raise_amount =
			cgs.players[client_id].money - cgs.current_round.bet + cgs.players[client_id].round_bet;

		if (cgs.current_round.bet - cgs.players[client_id].round_bet == 0) {
			available_actions.push("check");
		} else {
			available_actions.push("call");
		}

		if (max_raise_amount > 0) {
			available_actions.push(cgs.current_round.bet == 0 ? "bet" : "raise");
		}

		const confirm_bet_button = document.getElementById("bet-select-confirm");
		const bet_slider = document.querySelector("#bet-select>input");
		const selected_act = await new Promise((resolve) => {
			// resolve this promise with the bet slider's value when confirm bet is clicked
			confirm_bet_button.onclick = (e) => {
				confirm_bet_button.onclick = "";
				Object.values(btn).forEach((b2) => {
					b2.onclick = "";
					b2.style.display = "none";
				});
				resolve(bet_slider.value);
			};

			available_actions.forEach((act) => {
				// display the button for each available action
				const b = btn[act];
				b.style.display = "";

				// resolve with the button's corresponding value and clear event listeners when clicked
				if (["bet", "raise"].indexOf(act) == -1) {
					b.onclick = (e) => {
						confirm_bet_button.onclick = "";
						Object.values(btn).forEach((b2) => {
							b2.onclick = "";
							b2.style.display = "none";
						});
						resolve(act);
					};
				} else {
					// bet and raise buttons open the bet selection modal instead
					b.onclick = (e) => {
						bet_slider.setAttribute("min", 1);
						bet_slider.value = 1;
						bet_slider.setAttribute("max", max_raise_amount);
					};
				}
			});
		});

		ws.send(JSON.stringify({ id: client_id, move: selected_act }));
	}

	async function handle_move_rejected(msg) {
		// the client should probably never be in this state

		throw new Error("Not implemented.");
	}

	function handle_update_bet(msg) {
		const { player_id, next_player, checked, called, folded, bet } = msg;
		const current_player = cgs.players[player_id];
		let status_msg = `${id_to_name(player_id)} `;

		if (checked) {
			status_msg += "checked";
		} else if (folded) {
			status_msg += "folded";
			current_player.folded = true;
			change_portrait_indicator(player_id, "folded", client_id);
		} else if (called) {
			status_msg += called == current_player.money ? "all-inned" : "called";
			cgs.current_round.value += called;
			cgs.pot_total += called;
			current_player.money -= called;
			current_player.round_bet += called;
		} else if (bet) {
			status_msg += bet == current_player.money ? "all-inned" : `bet ${bet}`;
			cgs.current_round.bet = bet;
			cgs.current_round.value += bet;
			cgs.pot_total += bet;
			current_player.money -= bet;
			current_player.round_bet += bet;
		}

		cgs.players.forEach((p, i) => change_player_info_panel(i, p.money, p.round_bet, client_id));
		set_toast1_text(
			`Total Pot Amount: ${cgs.pot_total}\n\n` +
				`Current Round:\n Value:${cgs.current_round.value}\n\n` +
				`Bet to Match: ${cgs.current_round.bet}`,
		);
		set_toast2_text(status_msg);
		change_portrait_indicator(next_player, "active", client_id);
	}

	function handle_game_over(msg) {
		const { winner } = msg;
		msg_q.push(JSON.stringify({ exit: true }));
		exit_game(`${id_to_name(winner)} is the winner`);
	}

	function handle_server_failure() {
		msg_q.push(JSON.stringify({ exit: true }));
		exit_game(`Server failure encountered`);
	}

	function exit_game(gameover_text) {
		if (exit_flag) {
			// The exit_flag variable is set when the client presses the "btn-leave" button
			// Pressing that button changes the view back to lobby select, so there is no need
			// to display anything for that case
			return;
		}

		Object.values(btn).forEach((b) => {
			b.style.display = "none";
		});
		set_game_over_modal(gameover_text);
	}

	function one_player_not_folded() {
		const players_not_folded = cgs.players.filter((p) => !p.folded);
		return players_not_folded.length == 1;
	}

	function id_to_name(id) {
		switch (id) {
			case 0:
				return "cat";
			case 1:
				return "crow";
			case 2:
				return "dog";
			case 3:
				return "mouse";
		}
	}

	/**
	 * Wait for a given number of milliseconds before executing the given function. The function
	 * will not execute if the exit_flag variable is set to true, or if null is passed in as an argument.
	 *
	 * @param {Number} ms Number of milliseconds to wait for before executing the function
	 * @param {Function} fn The function to be executed after a wait
	 */
	async function cancelable_wait_then_exec(ms, fn) {
		return new Promise((resolve) => {
			setTimeout(() => {
				if (!exit_flag && fn != null) fn();
				resolve();
			}, ms);
		});
	}

	function reset_board(reset_to_initial_state = false) {
		cgs.pot_total = 0;

		[...table_cards, ...client_cards].forEach((e) => {
			e.style = "";
			set_card_display(e, "", false);
		});

		community_cards.forEach((e) => {
			e.style = "";
			e.style.display = "none";
			set_card_display(e, "", false);
		});

		["g-hand", "g-flop"].forEach((id) => {
			document.getElementById(id).style.opacity = 0;
		});

		Object.values(cgs.players).forEach((p) => {
			p.folded = p.money == 0;
			p.round_bet = 0;
		});

		player_portrait.forEach((p, i) => {
			change_portrait_indicator(
				i,
				cgs.players[i] && cgs.players[i].money == 0 && !reset_to_initial_state ? "folded" : "none",
				client_id,
			);
		});

		cgs.players.forEach((p, i) => {
			change_player_info_panel(i, p.money, p.bet_amount, client_id);
		});

		set_toast1_text("", false);
		set_toast2_text("", false);

		if (!reset_to_initial_state) return;

		player_portrait.forEach((p, i) => change_portrait(i, "", false));
		set_game_over_modal("", false);
	}

	function reset_round() {
		cgs.current_round = { bet: 0, value: 0 };
		Object.values(cgs.players).forEach((p) => (p.round_bet = 0));
		set_toast1_text(
			`Total Pot Amount: ${cgs.pot_total}\n\n` +
				`Current Round:\n Value:${cgs.current_round.value}\n\n` +
				`Bet to Match: ${cgs.current_round.bet}`,
		);
	}
}

function run_local_server() {
	throw Error("not implemented");
}

class AsyncQueue {
	constructor() {
		this.items = [];
		this.resolvers = [];
	}

	push(item) {
		if (this.resolvers.length > 0) {
			const resolve = this.resolvers.shift();
			resolve(item);
		} else {
			this.items.push(item);
		}
	}

	async get() {
		if (this.items.length > 0) {
			return this.items.shift();
		}
		return new Promise((resolve) => {
			this.resolvers.push(resolve);
		});
	}
}
