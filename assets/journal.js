const symptomsList = [
    "1. Zaburzenia snu", "2. Zachowania kompulsywne", "3. Ból fizyczny bez powodu", "4. Zaburzenia łaknienia",
    "5. Stałe zmęczenie", "6. Koncentracja na partnerze", "7. Organizowanie czasu partnerowi",
    "8. Kontrola trzeźwości", "9. Zamartwianie się", "10. Oczekiwanie podporządkowania",
    "11. Pouczanie / wyzywanie", "12. Działania za partnera", "13. Planowanie „gdyby nie pił”",
    "14. Poczucie pustki", "15. Napięcie i rozdrażnienie", "16. Nie mówienie wprost",
    "17. Pielęgnowanie złości", "18. Skupienie na krzywdzie",
    "19. Zwiększone konflikty", "20. Powątpiewanie w terapię", "21. Skupienie na innych",
    "22. Oczekiwanie instrukcji", "23. Usprawiedliwianie", "24. Wymówki",
    "25. Obwinianie", "26. Agresja", "27. Autoagresja"
];

const defaultQuotes = [
    "Nie musisz być idealny. — Anonim",
    "Każdy krok do przodu ma znaczenie. — Anonim",
    "Masz prawo odpocząć. — Anonim",
    "Trudności mijają. — Anonim",
    "Poproszenie o pomoc to odwaga. — Anonim",
    "Twoje uczucia są ważne. — Anonim",
    "Małe kroki budują zmiany. — Anonim",
    "Zadbaj o siebie dziś. — Anonim",
    "Nie musisz mieć wszystkich odpowiedzi. — Anonim",
    "Zmiana zaczyna się od małej decyzji. — Anonim",
    "Najważniejsza podróż to ta, którą odbywasz w głąb siebie. — Rilke",
    "Uzdrawianie nie oznacza, że ból zniknie. Oznacza, że ból nie będzie już kontrolował twojego życia. — Anonim",
    "Nie jesteś odpowiedzialny za czyjeś uzależnienie, ale jesteś odpowiedzialny za swoje życie. — Melody Beattie",
    "Granice to nie mury — to drzwi dla właściwych ludzi. — Anonim",
    "Nie musisz gasić czyjegoś pożaru kosztem własnego spokoju. — Anonim",
    "Każdy dzień to nowa szansa na zmianę. — Anonim"
];

const journal = {
    data: {},
    customQuotes: {},

    init() {
        const storage = JSON.parse(localStorage.getItem("terapia_journal") || "{}");
        this.data = storage.days || {};
        this.customQuotes = storage.customQuotes || {};
        this.theme = storage.theme || 'dark';
        if (Array.isArray(this.customQuotes)) this.customQuotes = {};
        
        // Migracja starego formatu (bool[]) na nowy format (int[])
        Object.keys(this.data).forEach(date => {
            const entry = this.data[date];
            if (entry.symptoms && entry.symptoms.length > 0 && typeof entry.symptoms[0] === 'boolean') {
                const newSymp = [];
                entry.symptoms.forEach((val, idx) => { if (val) newSymp.push(idx); });
                entry.symptoms = newSymp;
            }
        });

        document.documentElement.setAttribute('data-theme', this.theme);
        this.initThemeToggle();
    },

    persist() {
        localStorage.setItem("terapia_journal", JSON.stringify({ 
            days: this.data, 
            customQuotes: this.customQuotes,
            theme: this.theme
        }));
    },

    initThemeToggle() {
        document.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('themeToggle');
            if (!btn) return;
            btn.onclick = () => {
                this.theme = this.theme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', this.theme);
                this.persist();
            };
        });
    },

    saveDay(date, symptomsBools, note, eventsData = []) {
        // Konwersja booleantów na indeksy (oszczędność miejsca)
        const symptomIndices = [];
        symptomsBools.forEach((val, idx) => { if (val) symptomIndices.push(idx); });

        this.data[date] = { symptoms: symptomIndices, note };
        
        if (symptomIndices.length === 0 && !note.trim()) {
            delete this.data[date];
        }
        this.persist();

        // Sync to server
        const merged = [...eventsData.filter(e => !(e.date === date && e.type === 'journal'))];
        if (this.data[date]) {
            merged.push({
                id: `journal-${date}`, date: date, type: 'journal', title: 'Dziennik',
                description: note, symptoms: symptomIndices, color: 'green'
            });
        }
        fetch('api/save_events.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: merged })
        }).catch(() => { });
    },

    getQuote() {
        const all = [...defaultQuotes, ...Object.values(this.customQuotes)];
        return all[Math.floor(Math.random() * all.length)];
    },

    addCustomQuote(text) {
        if (!text.trim()) return;
        this.customQuotes[Date.now()] = text.trim();
        this.persist();
    },

    exportJSON() {
        const blob = new Blob([JSON.stringify({ days: this.data, customQuotes: this.customQuotes }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `dzienniczek_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    },

    importJSON(file, callback) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const obj = JSON.parse(e.target.result);
                this.data = obj.days || {};
                this.customQuotes = obj.customQuotes || {};
                this.persist();
                if (callback) callback();
            } catch(ex) {
                alert("Błąd formatu pliku JSON.");
            }
        };
        reader.readAsText(file);
    }
};

journal.init();
