const appDirButton = document.getElementById("app-dir-button")
const pageInfoButton = document.getElementById("page-info-button")
const appDir = document.getElementById("app-directory-content")
const pageInfo = document.getElementById("page-info-content")

let active = appDir

let playingAnim = false;

appDirButton.addEventListener("click", e => {
    if (playingAnim) return
    playingAnim = true

    appDirButton.style.borderBottom = "none"
    appDirButton.style.backgroundColor = "#dddddd"
    appDir.style.display = "block"
    setTimeout(() => {
        appDir.style.opacity = 1
    }, 2)
    pageInfoButton.style.borderBottom = ""
    pageInfoButton.style.backgroundColor = ""
    pageInfo.style.opacity = 0

    setTimeout(() => {
        pageInfo.style.display = "none"
        playingAnim = false
    }, 130)
})

pageInfoButton.addEventListener("click", e => {
    if (playingAnim) return
    playingAnim = true

    pageInfoButton.style.borderBottom = "none"
    pageInfoButton.style.backgroundColor = "#dddddd"
    pageInfo.style.display = "flex"
    setTimeout(e => {
        pageInfo.style.opacity = 1
    }, 2)
    appDirButton.style.borderBottom = ""
    appDirButton.style.backgroundColor = ""
    appDir.style.opacity = 0

    setTimeout(() => {
        appDir.style.display = "none"
        playingAnim = false
    }, 130)
})
