/**
 * array representing the order in which to draw windows ontop one another
 * Windows at a higher array index are given a higher z-index
 */
const windowStack = []

/**
 * A dictionary mapping appIds to the location of their files
 */
const appTable = {
    welcome: "./apps/welcome/welcome.html",
    info: "./apps/info/info.html",
    calculator: "./apps/calculator/calculator.html",
    games: "./apps/games/games.html",
    portfolio: "./apps/portfolio/portfolio.html"
}


// init code start
initTaskbarTime()
initTaskbarStart()
initDuck()
initWindows()
document.querySelectorAll("#screen-overlay .window").forEach(e => {
    makeDraggable(e)
})

const rect = document.getElementById("screen-overlay").getBoundingClientRect()
let windowSize = window.innerHeight < window.innerWidth ? window.innerHeight : window.innerWidth
windowSize = windowSize <= 600 ? windowSize * .8 : windowSize * .5
const centerX = (rect.width / 2) - (windowSize / 2)
const centerY = (rect.height / 2) - (windowSize / 2)

openWindow("welcome", centerY, centerX)
// init code end


/**
 * Runs an interval that periodically updates the screen's clock
 */
function initTaskbarTime() {
    const display = document.getElementById("taskbar-time")
    const interval = setInterval(() => {
        let now = new Date(Date.now())
        let hours = now.getHours()
        let minutes = now.getMinutes()

        let displayHours = hours == 0 || hours == 12 ? 12 : hours % 12
        let displayMinutes = minutes < 10 ? "0" + minutes : minutes
        display.innerText = `${displayHours}:${displayMinutes} ${hours < 12 ? "AM" : "PM"
            }`
    }, 2000)
}

/**
 * Adds click event to the start button to open start menu
 */
function initTaskbarStart() {
    let isActive = false;
    const startButton = document.getElementById("taskbar-start")
    const startMenu = document.getElementById("start-menu")

    startButton.addEventListener("click", e => {
        if (isActive) {
            isActive = false
            startMenu.style.opacity = 0
            startMenu.style.height = 0
        } else {
            isActive = true
            startMenu.style.opacity = 1
            startMenu.style.height = "400px"
        }
    })

    document.querySelectorAll(".window").forEach(window => {
        window.addEventListener("click", e => {
            isActive = false
            startMenu.style.opacity = 0
            startMenu.style.height = 0
        })
    })

}

/**
 * Adds click event to a duck icon to play a quack sfx
 */
function initDuck() {
    const duck = document.getElementById("desktop-duck")
    const quackSfx = document.getElementById("quack-sfx")
    quackSfx.volume = .5
    duck.addEventListener("click", () => {
        quackSfx.pause();
        quackSfx.currentTime = 0;
        quackSfx.play();
        console.log("quack")
    })
}

/**
 * Makes a window draggable
 */
function makeDraggable(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = document.querySelector(`#${elmnt.id} .window-header`)
    const container = document.getElementById("screen-overlay")
    header.onmousedown = dragMouseDown
    header.ontouchstart = dragMouseDown

    function dragMouseDown(e) {
        let x, y
        if (e.touches) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }
        pos3 = x;
        pos4 = y;
        disableIframeMouseEvents()
        document.addEventListener("mouseup", closeDragElement)
        document.addEventListener("touchend", closeDragElement)
        document.addEventListener("mousemove", elementDrag)
        document.addEventListener("touchmove", elementDrag)
    }

    function elementDrag(e) {
        let x, y
        if (e.touches) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }
        pos1 = pos3 - x;
        pos2 = pos4 - y;
        pos3 = x;
        pos4 = y;
        let newTop = elmnt.offsetTop - pos2
        let newLeft = elmnt.offsetLeft - pos1
        if (newTop >= 0 && newTop < container.clientHeight - 16
            && newLeft >= 0 && newLeft < container.clientWidth - 16) {
            elmnt.style.top = newTop + "px";
            elmnt.style.left = newLeft + "px";
        }
    }

    function closeDragElement() {
        document.removeEventListener("mouseup", closeDragElement)
        document.removeEventListener("touchend", closeDragElement)
        document.removeEventListener("mousemove", elementDrag)
        document.removeEventListener("touchmove", elementDrag)
        enableIframeMouseEvents()
    }

    function disableIframeMouseEvents() {
        document.querySelectorAll("iframe").forEach(iframe => {
            iframe.style.pointerEvents = "none"
        })
    }

    function enableIframeMouseEvents() {
        document.querySelectorAll("iframe").forEach(iframe => {
            iframe.style.pointerEvents = "auto"
        })
    }
}

/**
 * inits the window elements and the buttons for those windows
 */
function initWindows() {
    const postfix = "-window"
    document.querySelectorAll(".window").forEach(window => {
        // listen for clicks on the window close button
        let closeButton = document.querySelector(`#${window.id} .close`)
        closeButton.addEventListener("click", e => {
            closeWindow(window.id.substring(0, window.id.length - postfix.length))
        })

        // listen for clicks on the window maximize button
        let maximizeButton = document.querySelector(`#${window.id} .maximize`)
        maximizeButton.addEventListener("click", e => {
            if (window.style.width != "100%") {
                window.style.width = "100%"
                window.style.height = "100%"
                window.style.top = 0
                window.style.left = 0
                window.style.resize = "none"
            } else {
                window.style.width = ""
                window.style.height = ""
                window.style.resize = "both"
            }
        })

        // listen for clicks on the window area
        window.addEventListener("mousedown", e => {
            e.stopPropagation()
            sendToFront(window.id)
        })
        window.addEventListener("touchstart", e => {
            e.stopPropagation()
            sendToFront(window.id)
        })
    })

    // listen for clicks on things that open windows
    let ignoreList = ["github"]
    document.querySelectorAll("#start-menu-items>div").forEach(item => {
        if (ignoreList.includes(item.innerText)) {
            return
        }

        item.addEventListener("click", e =>
            openWindow(item.innerText.toLowerCase())
        )
    })

    ignoreList = ["duck"]
    const prefix = "desktop-"
    document.querySelectorAll("#desktop div").forEach(shortcut => {
        const appId = shortcut.id.substring(prefix.length)
        if (ignoreList.includes(appId)) {
            return
        }

        shortcut.addEventListener("click", e => openWindow(appId))
    })
}

/**
 * Updates the z-index of all windows to make one specific window appear atop every other
 */
function sendToFront(windowId) {
    windowStack.splice(windowStack.indexOf(`${windowId}`), 1)
    windowStack.push(`${windowId}`)

    for (let i = 0; i < windowStack.length; i++) {
        const window = document.getElementById(windowStack[i])
        const windowIframeOverlay = document.querySelector(`#${window.id} .iframe-overlay`)
        window.style.zIndex = i
        // block cursor events for all other iframes
        windowIframeOverlay.style.pointerEvents = "auto"
    }

    // allow cursor events for only this iframe to go through
    const iframeOverlay = document.querySelector(`#${windowId} .iframe-overlay`)
    iframeOverlay.style.pointerEvents = "none"
}

/**
 * Adds a button to the taskbar for a particular window app if it does not already exist
 */
function addWindowToTaskbar(appId) {
    if (document.querySelector(`#taskbar-windows #${appId}`) == null) {
        const taskbarWindows = document.getElementById("taskbar-windows")
        const taskbarElement = document.createElement("div")
        taskbarElement.innerText = `${appId}`
        taskbarElement.id = `${appId}`

        taskbarElement.addEventListener("click", e => {
            sendToFront(`${appId}-window`)
        })

        taskbarWindows.appendChild(taskbarElement)
    }
}

/**
 * Opens the specified window, making it visible, adding it to the taskbar, and
 * adding it to the window stack
 */
function openWindow(appId, top = 0, left = 0) {
    const window = document.getElementById(`${appId}-window`)

    if (window.style.display == "block") { // if window is already open
        sendToFront(`${appId}-window`)
        return
    }

    window.style.display = "block"
    window.style.top = `${top}px`
    window.style.left = `${left}px`
    setTimeout(() => {
        window.style.opacity = 1
    }, 5)

    const iframe = document.querySelector(`#${window.id} iframe`)
    const src = appTable[appId] || "./apps/placeholder/placeholder.html"
    iframe.src = src

    addWindowToTaskbar(appId)
    if (!windowStack.includes(window.id)) {
        windowStack.push(window.id)
    }
    sendToFront(window.id)
}

/**
 * Closes the specified window
 */
function closeWindow(appId) {
    const window = document.getElementById(`${appId}-window`)
    const iframe = document.querySelector(`#${window.id} iframe`)
    window.style.opacity = 0
    setTimeout(() => { // allows time for transition animation to play
        window.style.display = "none"
        iframe.src = ""
    }, 200)
    let taskbarWindow = document.querySelector(`#taskbar-windows #${appId}`)
    taskbarWindow.remove()

    windowStack.splice(windowStack.indexOf(`${window.id}`), 1)
}