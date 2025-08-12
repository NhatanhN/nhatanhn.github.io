const snakeListItem = document.getElementById("snake-list-item")
const gameLibrary = document.getElementById("catalogue")
const noSelectDiv = document.getElementById("no-games-select")
const gamesSelectDiv = document.getElementById("games-select")
const gameTitle = document.getElementById("game-title")
const gameSplashImg = null
const playButton = document.getElementById("play-button")
const backButton = document.getElementById("back-button")
const headerText = document.querySelector("header p")

let selectedGame = null

snakeListItem.addEventListener("click", e => {
    snakeListItem.style.backgroundColor = "#3E4E69"
    noSelectDiv.style.display = "none"
    gamesSelectDiv.style.display = "grid"
    gameTitle.innerText = "Snake"
    selectedGame = "snake"
})

playButton.addEventListener("click", e => {
    const game = document.getElementById(selectedGame)
    game.style.display = "grid"
    headerText.innerText = selectedGame
    gameLibrary.style.display = "none"
    backButton.style.display = "block"
})

backButton.addEventListener("click", e => {
    backButton.style.display = "none"
    document.querySelectorAll("section").forEach(section => {
        if (section.id == "catalogue") {
            section.style.display = ""
        } else {
            section.style.display = "none"
        }
    })
    headerText.innerText = "Library"

    document.removeEventListener("keydown", onArrowKeyPress)
})


/* SNAKE GAME */
const GAME_WIDTH = 21
const playWindow = document.querySelector("#snake div")
const dialogue = document.querySelector("#snake p")
const gameOverDialogue = document.getElementById("game-over-screen")
const scoreDisplay = document.querySelector("#game-over-screen span")
let direction = null
const actionBuffer = []
const actionBufferMaxLength = 2
let playing = false
let gameInterval = null
let snakeBody = null
let appleEaten = false
let snakeLength = 1

for (let i = 0; i < GAME_WIDTH * GAME_WIDTH; i++) {
    playWindow.append(document.createElement("div"))
}

document.addEventListener("keydown", onArrowKeyPress)

function onArrowKeyPress(e) {
    if (actionBuffer.length <= actionBufferMaxLength) {
        switch (e.key) {
            case "ArrowLeft":
                actionBuffer.push("left")
                break;
            case "ArrowRight":
                actionBuffer.push("right")
                break;
            case "ArrowUp":
                actionBuffer.push("up")
                break;
            case "ArrowDown":
                actionBuffer.push("down")
                break;
        }
    }
    play()
}

resetGame()

function getSquare(coords) {
    return document.querySelector(`#snake>div>:nth-child(${GAME_WIDTH * coords[0] + coords[1] + 3})`)
}

function play() {
    if (playing) return
    playing = true
    dialogue.style.display = "none"
    gameInterval = setInterval(step, 70)
}

function step() {
    const head = [snakeBody[0][0], snakeBody[0][1]]
    appleEaten = false
    if (actionBuffer.length > 0) {
        direction = actionBuffer.shift()
    }

    switch (direction) {
        case "left":
            head[1]--
            break;
        case "right":
            head[1]++
            break;
        case "up":
            head[0]--
            break;
        case "down":
            head[0]++
            break;
    }

    // is grid tile the previous snake body segment?
    if (snakeBody.length > 1
        && head[0] == snakeBody[1][0] && head[1] == snakeBody[1][1]) {
        switch (direction) {
            case "left":
                head[1] += 2
                direction = "right"
                break;
            case "right":
                head[1] -= 2
                direction = "left"
                break;
            case "up":
                head[0] += 2
                direction = "down"
                break;
            case "down":
                head[0] -= 2
                direction = "up"
                break;
        }
    }

    // is grid tile out of bounds?
    if (head[0] < 0 || head[0] >= GAME_WIDTH
        || head[1] < 0 || head[1] >= GAME_WIDTH) {
        stop()
        return
    }
    const headElement = getSquare(head)

    // is grid tile apple?
    if (headElement.className.indexOf("apple") != -1) {
        appleEaten = true
        snakeLength++
    }

    if (!appleEaten) {
        const tail = snakeBody.pop()
        getSquare(tail).className = ""
    }

    // is grid tile snake body?
    if (headElement.className.indexOf("snake-body") != -1) {
        stop()
        return
    }

    getSquare(head).className = "snake-body"
    snakeBody.unshift(head)

    if (appleEaten) spawnNewApple()
}

function spawnNewApple() {
    let emptyTiles = []
    for (let i = 0; i < GAME_WIDTH; i++) {
        for (let j = 0; j < GAME_WIDTH; j++) {
            let isSnakeBody = false
            for (let tile of snakeBody) {
                if (tile[0] == i && tile[1] == j) {
                    isSnakeBody = true
                    break
                }
            }

            if (isSnakeBody) continue
            emptyTiles.push([i, j])
        }
    }

    let appleTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)]
    getSquare(appleTile).className = "apple"
}

function stop() {
    gameOverDialogue.style.display = "initial"
    scoreDisplay.innerText = snakeLength
    clearInterval(gameInterval)
}

document.getElementById("reset-game-prompt").addEventListener("click", e => {
    resetGame()
})

function resetGame() {
    document.querySelectorAll("#snake>div>div").forEach(tile => {
        tile.className = ""
    })
    snakeBody = [[10, 10]]
    getSquare(snakeBody[0]).className = "snake-body"
    spawnNewApple()
    gameOverDialogue.style.display = "none"
    snakeLength = 0
    dialogue.style.display = "initial"
    playing = false
}
/* SNAKE GAME END */