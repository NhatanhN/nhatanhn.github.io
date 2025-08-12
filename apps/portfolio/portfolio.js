const navLinkMovie = document.querySelector('a[href="#movie-browser"]')
const navLinkLocation = document.querySelector('a[href="#location-tracker"]')
const navLinkNote = document.querySelector('a[href="#note-taker"]')

navLinkMovie.addEventListener("click", e => {
    navLinkMovie.style.backgroundColor = "#dddddd"
    navLinkLocation.style.backgroundColor = ""
    navLinkNote.style.backgroundColor = ""
})

navLinkLocation.addEventListener("click", e => {
    navLinkMovie.style.backgroundColor = ""
    navLinkLocation.style.backgroundColor = "#dddddd"
    navLinkNote.style.backgroundColor = ""
})

navLinkNote.addEventListener("click", e => {
    navLinkMovie.style.backgroundColor = ""
    navLinkLocation.style.backgroundColor = ""
    navLinkNote.style.backgroundColor = "#dddddd"
})

const h3s = document.querySelectorAll("section > h3")
const divs = document.querySelectorAll("h3 + div")
for (let i = 0; i < h3s.length; i++) {
    let isPlayingAnimation = false;
    const h3 = h3s[i]
    const div = divs[i]
    const arrow = h3s[i].querySelector("span")
    h3.addEventListener("click", e => {
        if (div.style.display == "none") {
            if (isPlayingAnimation) return
            isPlayingAnimation = true
            setTimeout(() => {
                isPlayingAnimation = false
            }, 400)

            div.style.display = ""
            arrow.style.transform = "rotate(0.25turn)"
            setTimeout(() => {
                div.style.height = ""
                div.style.opacity = "1"
            }, 5)
        } else {
            if (isPlayingAnimation) return
            isPlayingAnimation = true

            div.style.height = "0"
            div.style.opacity = "0"
            arrow.style.transform = ""
            setTimeout(() => {
                div.style.display = "none"
                isPlayingAnimation = false
            }, 397)
        }
    })
}