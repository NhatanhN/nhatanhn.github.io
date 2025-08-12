// themeing scripts //

const calc = document.getElementById("calculator")
const randomColorButton = document.getElementById("random-color")
const clearColorButton = document.getElementById("clear-color")

randomColorButton.addEventListener("click", e => {
    calc.style.background = getRandomGradient()
})

clearColorButton.addEventListener("click", e => {
    calc.style.background = ""
})

function getRandomGradient() {
    function randomValue(n) {
        return Math.floor(Math.random() * n)
    }

    function randomHex() {
        const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, "A", "B", "C", "D", "E", "F"]
        return `#${digits[randomValue(16)]}${digits[randomValue(16)]}${digits[randomValue(16)]}`
            + `${digits[randomValue(16)]}${digits[randomValue(16)]}${digits[randomValue(16)]}`
    }

    let gradient = ""
    const positions = [
        "top right",
        "top",
        "top left",
        "right",
        "left",
        "bottom right",
        "bottom",
        "bottom left"
    ]
    if (randomValue(2) == 0) {
        gradient += `linear-gradient(${randomValue(360)}deg, ${randomHex()}, ${randomHex()})`
    } else {
        gradient += "radial-gradient(at "
        if (randomValue(9) == 0) {
            gradient += `center, ${randomHex()}, ${randomHex()})`
        } else {
            gradient += `${positions[randomValue(8)]}, ${randomHex()}, ${randomHex()})`
        }
    }

    return gradient
}

// calculator scripts // 

const screen = document.getElementById("output")
const prevFunction = document.getElementById("prev-function")
screen.innerText = 0
let prevVal = null
let overwrite = false
let operatorLastPressed = false

function format(num) {
    let str = num.toPrecision(7)
    let removeDecimal = false
    let exp
    if (str.indexOf("e") != -1) {
        exp = str.substring(str.indexOf("e") + 1)
    }

    let i
    for (i = 7; i >= 0; i--) {
        if (str.charAt(i) != 0) {
            removeDecimal = str.charAt(i) == "."
            break;
        }
    }

    if (removeDecimal) {
        str = str.substring(0, i)
    } else {
        str = str.substring(0, i + 1)
    }

    return str + (exp == null ? "" : "e" + exp)
}

for (let i = 0; i < 10; i++) {
    let num = document.getElementById(i)
    num.addEventListener("click", e => {
        // removes leading zeroes
        if (screen.innerText.length == 1 && screen.innerText.charAt(screen.innerText.length - 1) == 0) {
            screen.innerText = screen.innerText.substring(0, screen.innerText.length - 1)
        }

        if (overwrite) {
            screen.innerText = i
            overwrite = false
        } else if (screen.innerText.length < 8) {
            screen.innerText += i
        }
        operatorLastPressed = false
    })
}

document.getElementById("clear").addEventListener("click", e => {
    screen.innerText = 0
    prevVal = null
    prevFunction.innerText = ""
    operatorLastPressed = false
})

document.getElementById("decimal").addEventListener("click", e => {
    if (overwrite) {
        screen.innerText = "0."
        overwrite = false
    } else {
        if (screen.innerText.indexOf(".") == -1) {
            screen.innerText += "."
        }
    }
    operatorLastPressed = false
})

document.getElementById("modulo").addEventListener("click", e => {
    if (operatorLastPressed) return
    if (prevFunction) evaluate()

    let result
    if (prevVal == null) {
        result = Number.parseFloat(screen.innerText)
    } else {
        result = prevVal % Number.parseFloat(screen.innerText)
    }
    screen.innerText = format(result)
    prevVal = result
    overwrite = true
    prevFunction.innerText = "%"
    operatorLastPressed = true
})

document.getElementById("divide").addEventListener("click", e => {
    if (operatorLastPressed) return
    if (prevFunction) evaluate()

    let result
    if (prevVal == null) {
        result = Number.parseFloat(screen.innerText)
    } else {
        result = prevVal / Number.parseFloat(screen.innerText)
    }
    screen.innerText = format(result)
    prevVal = result
    overwrite = true
    prevFunction.innerText = "÷"
    operatorLastPressed = true
})

document.getElementById("times").addEventListener("click", e => {
    if (operatorLastPressed) return
    if (prevFunction) evaluate()

    let result
    if (prevVal == null) {
        result = Number.parseFloat(screen.innerText)
    } else {
        result = prevVal * Number.parseFloat(screen.innerText)
    }
    screen.innerText = format(result)
    prevVal = result
    overwrite = true
    prevFunction.innerText = "×" // not letter "x", but the times symbol
    operatorLastPressed = true
})

document.getElementById("minus").addEventListener("click", e => {
    if (operatorLastPressed) return
    if (prevFunction) evaluate()

    let result
    if (prevVal == null) {
        result = Number.parseFloat(screen.innerText)
    } else {
        result = prevVal - Number.parseFloat(screen.innerText)
    }
    screen.innerText = format(result)
    prevVal = result
    overwrite = true
    prevFunction.innerText = "-"
    operatorLastPressed = true
})

document.getElementById("plus").addEventListener("click", e => {
    if (operatorLastPressed) return
    if (prevFunction) evaluate()

    let result = prevVal + Number.parseFloat(screen.innerText)
    screen.innerText = format(result)
    prevVal = result
    overwrite = true
    prevFunction.innerText = "+"
    operatorLastPressed = true
})

document.getElementById("enter").addEventListener("click", e => {
    evaluate()
    prevVal = screen.innerText
    operatorLastPressed = false
})

function evaluate() {
    let result
    switch (prevFunction.innerText) {
        case "%":
            result = prevVal % Number.parseFloat(screen.innerText)
            break;
        case "÷":
            result = prevVal / Number.parseFloat(screen.innerText)
            break;
        case "×":
            result = prevVal * Number.parseFloat(screen.innerText)
            break;
        case "-":
            result = prevVal - Number.parseFloat(screen.innerText)
            break;
        case "+":
            result = prevVal + Number.parseFloat(screen.innerText)
            break;
        default:
            result = Number.parseFloat(screen.innerText)
    }

    screen.innerText = format(result)
    prevVal = null
    overwrite = true
    prevFunction.innerText = ""
}