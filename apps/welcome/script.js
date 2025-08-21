const link = document.getElementById("portfolio-link")

link.addEventListener("click", e => {
    window.parent.openWindow("portfolio")
})