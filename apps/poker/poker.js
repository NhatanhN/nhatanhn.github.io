const views = {
	welcome: document.getElementById("welcome-screen"),
	lobby_select: document.getElementById("lobby-select"),
	game: document.getElementById("game"),
	attributions: document.getElementById("attributions"),
};

function change_view(target) {
	for (let key in views) {
		views[key].style = `display: ${key == target ? "block" : "none"}`;
	}
}

document.getElementById("btn-solo").onclick = (e) => {
	change_view("game");
	play_game();
};
document.getElementById("btn-lobby").onclick = (e) => {
	change_view("lobby_select");
	query_lobbies();
};
document.getElementById("btn-attrib").onclick = (e) => {
	change_view("attributions");
};
document.getElementById("btn-lobby-back").onclick = (e) => {
	change_view("welcome");
};
document.getElementById("btn-attributions-back").onclick = (e) => {
	change_view("welcome");
};

/*======= Lobby =======*/

const endpoint = "https://poker-container-app.orangestone-e4ba5e11.westus2.azurecontainerapps.io";

document.getElementById("btn-new-lobby").onclick = (e) => {
	const modal = document.getElementById("new-lobby-container");
	const button = document.getElementById("btn-new-lobby");
	modal.style.display = modal.style.display == "none" ? "" : "none";
	button.innerText = modal.style.display == "none" ? "create a lobby" : "close popup";
};

const new_lobby_form = document.getElementById("new-lobby-form");
new_lobby_form.onsubmit = async (e) => {
	e.preventDefault();

	const lobby_name = new FormData(new_lobby_form).get("lobby_name");
	const status_e = new_lobby_form.querySelector("span");

	status_e.innerText = "";
	if (lobby_name.length < 2) {
		status_e.innerText = "lobby name must be at least two characters long";
		return;
	}

	const res = await fetch(`${endpoint}/lobby?lobby_name=${lobby_name}`, {
		method: "POST",
	});

	const json = await res.json();

	if (res.ok) {
		query_lobbies();
		document.getElementById("btn-new-lobby").click();
	} else if (json["detail"]) {
		status_e.innerText = json["detail"];
	} else {
		status_e.innerText = "failed to create lobby";
	}
};

async function query_lobbies() {
	const lobby_container = document.getElementById("lobby-container");
	lobby_container.innerHTML = `<p class="loading-text">Loading</p>`;

	const res = await fetch(`${endpoint}/lobby`);
	const lobbies = (await res.json())["lobbies"];

	if (!res.ok) {
		lobby_container.innerHTML = `<p class="no-lobbies-text">Server unable to be reached <p>`;
	} else if (lobbies.length == 0) {
		lobby_container.innerHTML = `<p class="no-lobbies-text">No lobbies open</p>`;
	} else {
		lobby_container.innerHTML = "";
		lobbies.forEach((lobby) => {
			const { id, player_count } = lobby;
			const div = document.createElement("div");
			div.className = "lobby-entry";
			div.innerHTML = `<p>${id}</p><p>${player_count == 4 ? "full" : player_count + " active players"}</p>`;
			const btn = document.createElement("button");
			btn.innerText = "join";
			if (player_count >= 4) {
				btn.setAttribute("disabled", true);
				btn.style.cursor = "not-allowed";
			} else {
				btn.onclick = create_join_lobby_handler(id, btn);
			}
			div.appendChild(btn);
			lobby_container.appendChild(div);
		});
	}
}

function create_join_lobby_handler(id, self) {
	return () => {
		self.onclick = "";
		self.innerText = "joining lobby...";
		const sock = new WebSocket(`${endpoint}/ws/${id}`);

		sock.onopen = async (e) => {
			change_view("game");
			await play_game(sock);
			sock.close();
		};
	};
}
