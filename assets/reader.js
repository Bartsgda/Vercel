const reader = {

    rate: 1.1,
    sentences: [],
    index: 0,
    speech: null,

    prepare() {

        const container = document.getElementById("text")

        let raw = container.innerText

        this.sentences = raw.match(/[^\\.\\!\\?]+[\\.\\!\\?]+/g)

        container.innerHTML = ""

        this.sentences.forEach((s, i) => {

            let span = document.createElement("span")

            span.className = "sentence"

            span.id = "sentence_" + i

            span.textContent = s + " "

            container.appendChild(span)

        })

    },

    play() {

        if (this.sentences.length === 0) {
            this.prepare()
        }

        this.speak()

    },

    speak() {

        if (this.index >= this.sentences.length) return

        document.querySelectorAll(".sentence").forEach(e => e.classList.remove("active"))

        let el = document.getElementById("sentence_" + this.index)

        el.classList.add("active")

        el.scrollIntoView({
            behavior: "smooth",
            block: "center"
        })

        this.speech = new SpeechSynthesisUtterance(this.sentences[this.index])

        this.speech.lang = "pl-PL"

        this.speech.rate = this.rate

        this.speech.onend = () => {

            this.index++

            this.speak()

        }

        speechSynthesis.speak(this.speech)

    },

    pause() {

        speechSynthesis.pause()

    },

    resume() {

        speechSynthesis.resume()

    },

    stop() {

        speechSynthesis.cancel()

        this.index = 0

        document.querySelectorAll(".sentence").forEach(e => e.classList.remove("active"))

    }

}

document.getElementById("speed").addEventListener("input", e => {

    reader.rate = e.target.value

    document.getElementById("speedValue").innerText = e.target.value

})