const h3s = document.querySelectorAll("section>h3")
const collapsibles = document.querySelectorAll(".collapsible")

for (let i = 0; i < h3s.length; i++) {
    // makes each h3 tag a clickable toggle for its accompanying .collapsible 
    // element
    let isAnimPlaying = false
    h3s[i].addEventListener("click", e => {
        if (isAnimPlaying) return
        isAnimPlaying = true

        const span = h3s[i].children[0]
        const collapsible = collapsibles[i]
        if (collapsible.style.display == "none") {
            span.style.transform = "rotate(90deg)"

            collapsible.style.display = ""
            setTimeout(() => {
                collapsible.style.height = ""
                collapsible.style.opacity = "1"
            }, 5)
        } else {
            span.style.transform = ""
            collapsible.style.height = "0"
            collapsible.style.opacity = ""
            setTimeout(() => {
                collapsible.style.display = "none"
            }, 400)
        }

        setTimeout(() => {
            isAnimPlaying = false
        }, 400)
    })
}