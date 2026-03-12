/* =====================================================
   TERAPIA – calendar.js (UI Layer)
   Handles: Calendar Grid, Modals, Stats Display
   ===================================================== */

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let eventsData = [];   // Remote tasks/lessons
let chaptersData = []; // Remote chapters
let selectedDate = null;

const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

function loadRemoteData() {
    Promise.all([
        fetch('data/events.json').then(r => r.json()).catch(() => ({ events: [] })),
        fetch('data/chapters.json').then(r => r.json()).catch(() => ({ chapters: [] }))
    ]).then(([ev, ch]) => {
        eventsData = ev.events || [];
        chaptersData = ch.chapters || [];
        renderCalendar();
    });
}

function prevMonth() { if (--currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar(); }
function nextMonth() { if (++currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(); }

function renderCalendar() {
    const grid = document.getElementById('calGrid');
    const label = document.getElementById('monthName');
    if (!grid) return;
    grid.innerHTML = '';
    if (label) label.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    let firstDay = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();

    // Padding for empty start of month
    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(Object.assign(document.createElement('div'), { className: 'calDay is-empty' }));
    }

    // Merge chapter events for display
    let combined = [...eventsData];
    chaptersData.forEach(chap => {
        if (chap.date) {
            combined.push({ 
                id: `chap-${chap.id}`, date: chap.date, type: 'chapter', 
                title: chap.title, chapterId: chap.id, color: 'blue' 
            });
        }
    });

    const isMini = grid.classList.contains('calGrid--mini');

    for (let i = 1; i <= lastDay; i++) {
        const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayEvents = combined.filter(e => e.date === ds);
        const jEntry = journal.data[ds];

        const div = document.createElement('div');
        div.className = 'calDay';
        if (new Date(currentYear, currentMonth, i).toDateString() === today.toDateString()) div.classList.add('is-today');
        if (jEntry) div.classList.add('has-entry');

        let html = `<div class="calDay__num">${i}</div>`;
        
        if (isMini) {
            // Minimalist dots for mini cal
            if (dayEvents.length || jEntry) {
                html += `<div class="miniDots">`;
                if (dayEvents.some(e => e.type === 'chapter')) html += `<div class="miniDot miniDot--blue"></div>`;
                if (dayEvents.some(e => e.type === 'task')) html += `<div class="miniDot miniDot--blue"></div>`;
                if (jEntry && jEntry.symptoms && jEntry.symptoms.length > 0) html += `<div class="miniDot miniDot--green"></div>`;
                html += `</div>`;
            }
        } else {
            // Horizontal pills for dashboard
            dayEvents.forEach(e => {
                const icon = e.type === 'chapter' ? '📚' : '📝';
                const link = e.type === 'chapter' ? `chapter.php?id=${e.chapterId}` : (e.fileUrl || '#');
                const target = e.type === 'task' ? '_blank' : '_self';
                
                html += `<a href="${link}" target="${target}" class="calEventPill calEventPill--${e.color || 'blue'}" title="${e.title}" onclick="event.stopPropagation()">
                            <span class="calEventPill__icon">${icon}</span>
                            <span class="calEventPill__txt">${e.title}</span>
                         </a>`;
            });

            // Journal dot
            if (jEntry) {
                html += `<div class="journalDot" title="Dzienniczek wypełniony"></div>`;
            }
        }

        div.innerHTML = html;
        div.onclick = () => openModal(ds, dayEvents);
        grid.appendChild(div);
    }
    updateStats();
}

function openModal(dateStr, events) {
    selectedDate = dateStr;
    const modal = document.getElementById('calModal');
    const body = document.getElementById('modalBody');
    document.getElementById('modalTitle').textContent = dateStr.split('-').reverse().join('.');

    const j = journal.data[dateStr] || { symptoms: [], note: '' };

    let html = `<div class="successorEditor">`;

    // Tasks/Chapters
    const serverEvents = (events || []).filter(e => e.type !== 'journal');
    if (serverEvents.length) {
        html += `<div class="successorEditor__section"><h3 class="successorEditor__title">Zadania i Lekcje</h3><div class="eventList">`;
        serverEvents.forEach(e => {
            let badge = 'Zadanie';
            if (e.type === 'chapter') badge = 'Lekcja';
            if (e.type === 'note') badge = 'Notatka';

            const link = e.type === 'chapter' ? `chapter.php?id=${e.chapterId}` : (e.fileUrl || '');
            
            html += `<div class="eventCard">
                        <div class="eventCard__title">${e.title} <span class="eventBadge">${badge}</span></div>`;
            
            if (e.description) {
                html += `<div class="eventCard__desc" style="font-size:12px; color:var(--muted); margin: 4px 0 8px;">${e.description}</div>`;
            }

            if (link) {
                html += `<a href="${link}" class="eventCard__cta" target="${e.type === 'task' ? '_blank' : '_self'}">Otwórz</a>`;
            }
            
            html += `</div>`;
        });
        html += `</div></div>`;
    }

    // Symptoms
    html += `<div class="successorEditor__section"><h3 class="successorEditor__title">Samoobserwacja</h3><div class="symptomGrid">`;
    symptomsList.forEach((s, i) => {
        const chk = (j.symptoms && j.symptoms.includes(i)) ? 'checked' : '';
        html += `<label class="symptomItem"><input type="checkbox" class="symptomCheck" data-index="${i}" ${chk}><span>${s}</span></label>`;
    });
    html += `</div></div>`;

    // Notes
    html += `<div class="successorEditor__section"><h3 class="successorEditor__title">Notatki z dnia</h3>
             <textarea id="dayNote" class="successorNote" placeholder="Co się dzisiaj wydarzyło?">${j.note || ''}</textarea></div>`;

    html += `</div><div class="calModal__footer"><button class="saveBtn" onclick="saveDayUI()">Zapisz 💾</button></div>`;

    body.innerHTML = html;
    modal.classList.add('is-open');
}

function saveDayUI() {
    const note = document.getElementById('dayNote').value;
    const checks = document.querySelectorAll('.symptomCheck');
    const symptoms = Array.from(checks).map(c => c.checked);

    journal.saveDay(selectedDate, symptoms, note, eventsData);
    
    document.getElementById('calModal').classList.remove('is-open');
    renderCalendar();
}

function updateStats() {
    const keys = Object.keys(journal.data);
    const sd = document.getElementById('statDays');
    const sa = document.getElementById('statAvg');
    const sl = document.getElementById('statLast');
    if (!sd) return;

    sd.textContent = keys.length;
    if (!keys.length) { sa.textContent = '0'; sl.textContent = '—'; return; }

    let total = 0;
    keys.forEach(k => { total += (journal.data[k].symptoms || []).length; });
    sa.textContent = (total / keys.length).toFixed(1);
    sl.textContent = keys.sort().slice(-1)[0].split('-').reverse().join('.');
}

function showMonthView() {
    document.getElementById('monthModalTitle').textContent = `${monthNames[currentMonth]} ${currentYear}`;
    const days = new Date(currentYear, currentMonth + 1, 0).getDate();
    const cont = document.getElementById('monthTableContainer');

    let html = `<table class="month-table"><thead><tr><th>Objaw</th>`;
    for (let d = 1; d <= days; d++) html += `<th>${d}</th>`;
    html += `</tr></thead><tbody>`;

    symptomsList.forEach((s, i) => {
        let name = s.replace(/^\d+\.\s*/, '');
        if (name.length > 22) name = name.substring(0, 19) + '…';
        html += `<tr><td title="${s}">${i + 1}. ${name}</td>`;
        for (let d = 1; d <= days; d++) {
            const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const has = journal.data[ds] && journal.data[ds].symptoms && journal.data[ds].symptoms.includes(i);
            html += `<td class="${has ? 'has-symptom' : ''}">${has ? '✓' : ''}</td>`;
        }
        html += `</tr>`;
    });

    html += `<tr class="month-summary-row"><td><strong>SUMA</strong></td>`;
    for (let d = 1; d <= days; d++) {
        const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cnt = (journal.data[ds] && journal.data[ds].symptoms) ? journal.data[ds].symptoms.length : 0;
        html += `<td><strong>${cnt || ''}</strong></td>`;
    }
    html += `</tr></tbody></table>`;

    cont.innerHTML = html;
    document.getElementById('monthOverlay').style.display = 'flex';
}

function refreshQuoteUI() {
    const el = document.getElementById('quoteText');
    if (el) el.textContent = journal.getQuote();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadRemoteData();

    // Date header
    const td = new Date();
    const daysPL = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
    const mPL = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
    const th = document.getElementById('todayHeader');
    
    if (th) {
        // Imieniny - simple local logic for current day
        const namedayList = {
            "1-1": "Mieszka, Mieczysława", "2-1": "Grzegorza, Makarego", "3-1": "Danuty, Genowefy", "4-1": "Anieli, Tytusa", "5-1": "Edwarda, Szymona", 
            "6-1": "Trzech Króli, Kacpra, Melchiora, Baltazara", "7-1": "Lucjana, Juliana", "8-1": "Seweryna, Juliusza", "9-1": "Marceliny, Marianny", 
            "10-1": "Wilhelma, Dobrosława", "11-1": "Honoraty, Matyldy", "12-1" : "Arkadiusza, Benedykta", "13-1": "Bogumiła, Weroniki", "14-1": "Feliksa, Hilarego",
            "15-1": "Pawła, Maurów", "16-1": "Marcelego, Włodzimierza", "17-1": "Antoniego, Jana", "18-1": "Małgorzaty, Piotra", "19-1": "Henryka, Marty",
            "20-1": "Fabiana, Sebastiana", "21-1": "Agnieszki, Marcela", "22-1": "Anastazego, Wincentego", "23-1": "Ildefonsa, Rajmunda", "24-1": "Rafała, Felicji",
            "25-1": "Pawła, Miłosza", "26-1": "Pauliny, tytusa", "27-1": "Jana, Przybysława", "28-1": "Walerego, Karola", "29-1": "Zdzisława, Franciszka",
            "30-1": "Martyny, Macieja", "31-1": "Jana, Marceli",
            "1-2": "Brygidy, Ignacego", "2-2": "Marii, Mirosława", "3-2": "Błażeja, Oskara", "4-2": "Andrzeja, Weroniki", "5-2": "Agaty, Adelajdy",
            "6-2": "Doroty, Bogdana", "7-2": "Ryszarda, Teodora", "8-2": "Hieronima, Sebastiana", "9-2": "Apolonii, Eryka", "10-2": "Elżbiety, Jacka",
            "11-2": "Marii, Grzegorza", "12-2": "Eulalii, Radosława", "13-2": "Katarzyny, Grzegorza", "14-2": "Walentego, Metodego", "15-2": "Faustyna, Jowity",
            "16-2": "Danuty, Juliana", "17-2": "Donata, Łukasza", "18-2": "Szymona, Konstancji", "19-2": "Konrada, Arnolda", "20-2": "Leona, Zenobiusza",
            "21-2": "Eleonory, Feliksa", "22-2": "Małgorzaty, Marty", "23-2": "Romany, Damiana", "24-2": "Macieja, Marka", "25-2": "Wiktora, Cezarego",
            "26-2": "Mirosława, Aleksandra", "27-2": "Gabriela, Anastazji", "28-2": "Romana, Ludomira", "29-2": "Lecha, Oswalda",
            "1-3": "Albiny, Antoniny", "2-3": "Heleny, Karola", "3-3": "Maryny, Kunegundy", "4-3": "Kazimierza, Łucji", "5-3": "Fryderyka, Adriana",
            "6-3": "Róży, Wiktora", "7-3": "Tomasza, Felicyty", "8-3": "Beaty, Wincentego", "9-3": "Franciszki, Brunona", "10-3": "Cypriana, Aleksandra",
            "11-3": "Luduwiła, Konstantyna", "12-3": "Grzegorza, Bernarda", "13-3": "Bożeny, Krystyny", "14-3": "Leona, Matyldy", "15-3": "Klemensa, Longina",
            "16-3": "Izabeli, Oktawii", "17-3": "Patryka, Zbigniewa", "18-3": "Cyryla, Edwarda", "19-3": "Józefa, Bogdana", "20-3": "Eufemii, Klaudii",
            "21-3": "Ludomira, Benedykta", "22-3": "Katarzyny, Bogusława", "23-3": "Pelagii, Oktawiana", "24-3": "Marka, Gabriela", "25-3": "Marii, Wieńczysława",
            "26-3": "Emanuela, Teodora", "27-3": "Jana, Ernesta", "28-3": "Anieli, Sykstusa", "29-3": "Wiktora, Eustachego", "30-3": "Amelii, Jana", "31-3": "Balbiny, Kornelii",
            "1-4": "Grażyny, Ireny", "2-4": "Franciszka, Władysława", "3-4": "Ryszarda, Pankracego", "4-4": "Izydora, Wacława", "5-4": "Ireny, Wincentego",
            "6-4": "Celestyna, Wilhelma", "7-4": "Donata, Rufina", "8-4": "Dionizego, Julii", "9-4": "Marii, Marcelego", "10-4": "Michała, Makarego",
            "11-4": "Leona, Filipa", "12-4": "Juliusza, Zenona", "13-4": "Przemysława, Hermenegildy", "14-4": "Bereniki, Waleriana", "15-4": "Ludwiki, Anastazji",
            "16-4": "Bernadety, kseni", "17-4": "Roberta, Patrycego", "18-4": "Alicji, Bogumiła", "19-4": "Adolfa, Tymona", "20-4": "Czesława, Agnieszki",
            "21-4": "Bartosza, Feliksa", "22-4": "Łukasza, Kai", "23-4": "Jerzego, Wojciecha", "24-4": "Aleksandra, Horacego", "25-4": "Marka, Jarosława",
            "26-4": "Marzeny, Klaudiusza", "27-4": "Zyty, Felicji", "28-4": "Pawła, Walerii", "29-4": "Piotra, Pawła", "30-4": "Mariana, Jakuba",
            "1-5": "Józefa, Jeremiasza", "2-5": "Zygmunta, Atanazego", "3-5": "Marii, Aleksandra", "4-5": "Moniki, Floriana", "5-5": "Ireny, Waldemara",
            "6-5": "Filipa, Judyty", "7-5": "Benedykta, Gizeli", "8-5": "Stanisława, Wiktora", "9-5": "Grzegorza, Karoliny", "10-5": "Antoniego, Izydora",
            "11-5": "Ignacego, Mamerta", "12-5": "Pankracego, Dominika", "13-5": "Serwacego, Glorii", "14-5": "Bonifacego, Dobiesława", "15-5": "Zofii, Nadziei",
            "16-5": "Andrzeja, Szymona", "17-5": "Weroniki, Sławomira", "18-5": "Eryka, Feliksa", "19-5": "Piotra, Celestyna", "20-5": "Bernarda, Bazylego",
            "21-5": "Wiktora, Kryspina", "22-5": "Heleny, Wiesławy", "23-5": "Iwony, Dezyderego", "24-5": "Joanny, Zuzanny", "25-5": "Grzegorza, Urbana",
            "26-5": "Filipa, Pauliny", "27-5": "Augustyna, Juliana", "28-5": "Jaromira, Justyna", "29-5": "Magdaleny, Teodozji", "30-5": "Feliksa, Ferdynanda", "31-5": "Anieli, Petroneli",
            "1-6": "Jakuba, Konrada", "2-6": "Erazma, Marianny", "3-6": "Leszka, Tamary", "4-6": "Franciszka, Karola", "5-6": "Walerii, Bonifacego",
            "6-6": "Pauliny, Norberta", "7-6": "Roberta, Wiesława", "8-6": "Maksyma, Medarda", "9-6": "Peliksy, Pelagii", "10-6": "Bogumiła, Małgorzaty",
            "11-6": "Barnaby, Radomiła", "12-6": "Onufrego, Jana", "13-6": "Lucjana, Antoniego", "14-6": "Bazylego, Elwiry", "15-6": "Wita, Jolanty",
            "16-6": "Aliny, Benona", "17-6": "Adolfa, Laury", "18-6": "Elżbiety, Marka", "19-6": "Gerwazego, Protazego", "20-6": "Bogny, Florentyny",
            "21-6": "Alicji, Alojzego", "22-6": "Pauliny, Tomasza", "23-6": "Wandy, Zenona", "24-6": "Jana, Danuty", "25-6": "Łucji, Wilhelma",
            "26-6": "Jana, Pawła", "27-6": "Marii, Władysława", "28-6": "Leona, Ireneusza", "29-6": "Piotra, Pawła", "30-6": "Emilii, Lucyny",
            "1-7": "Haliny, Mariana", "2-7": "Jagody, Urbana", "3-7": "Jacka, Anatola", "4-7": "Elżbiety, Malwiny", "5-7": "Karoliny, Cyryla",
            "6-7": "Dominiki, Łucji", "7-7": "Benedykta, Estery", "8-7": "Adriana, Eugeniusza", "9-7": "Lukrecji, Weroniki", "10-7": "Olaf, Witalisa",
            "11-7": "Olgi, Benedykta", "12-7": "Jana, Brunona", "13-7": "Ernesto, Małgorzaty", "14-7": "Bonawentury, Marceliny", "15-7": "Dawida, Henryka",
            "16-7": "Marii, Eustachego", "17-7": "Bogdana, Aleksego", "18-7": "Szymona, Kamila", "19-7": "Wincentego, Wodzisława", "20-7": "Czesława, Hieronima",
            "21-7": "Daniela, Dalidy", "22-7": "Marii Magdaleny, Bolesława", "23-7": "Bogny, Apolinarego", "24-7": "Kingi, Krystyny", "25-7": "Jakuba, Krzysztofa",
            "26-7": "Anny, Mirosławy", "27-7": "Julii, Natalii", "28-7": "Wiktora, Innocentego", "29-7": "Marty, Olafa", "30-7": "Julity, Ludmiły", "31-7": "Ignacego, Heleny",
            "1-8": "Piotra, Juliana", "2-8": "Kariny, Gustawa", "3-8": "Lidii, Augusta", "4-8": "Dominika, Protazego", "5-8": "Marii, Oswalda",
            "6-8": "Sławomira, Jakuba", "7-8": "Kajetana, Doroty", "8-8": "Cypriana, Emiliana", "9-8": "Romana, Edyty", "10-8": "Borysa, Wawrzyńca",
            "11-8": "Zuzanny, Filomeny", "12-8": "Klary, Lecha", "13-8": "Diany, Hipolita", "14-8": "Alfreda, Euzebiusza", "15-8": "Marii, Napoleona",
            "16-8": " Rocha, Joachima", "17-8": "Jacka, Mirona", "18-8": "Heleny, Bronisława", "19-8": "Jana, Bolesława", "20-8": "Bernarda, Samuela",
            "21-8": "Joanny, Kazimiery", "22-8": "Cezarego, Sławomira", "23-8": "Filipa, Apolinarego", "24-8": "Bartłomieja, Jerzego", "25-8": "Ludwika, Patrycji",
            "26-8": "Marii, Zefiryny", "27-8": "Moniki, Cezarego", "28-8": "Augustyna, Aleksego", "29-8": "Beaty, Sabiny", "30-8": "Róży, Szczęsnego", "31-8": "Bogdana, Ramonda",
            "1-9": "Bronisława, Idziego", "2-9": "Juliana, Stefana", "3-9": "Izabeli, Szymona", "4-9": "Rozalii, Róży", "5-9": "Doroty, Wawrzyńca",
            "6-9": "Beaty, Eugeniusza", "7-9": "Reginy, Melchiora", "8-9": "Marii, Adrianny", "9-9": "Piotra, Sergiusza", "10-9": "Łukasza, Mikołaja",
            "11-9": "Jacka, Prota", "12-9": "Gwidona, Radzimira", "13-9": "Eugenia, Aureliusza", "14-9": "Roksany, Bernarda", "15-9": "Albina, Nikodema",
            "16-9": "Edyty, Kornela", "17-9": "Franciszka, Roberta", "18-9": "Ireny, Józefa", "19-9": "Januarego, Konstancji", "20-9": "Filipiny, Eustachego",
            "21-9": "Mateusza, Hipolita", "22-9": "Tomasza, Maurycego", "23-9": "Tekli, Bogusława", "24-9": "Gerarda, Teodora", "25-9": "Władysława, Aurelii",
            "26-9": "Justyny, Damiana", "27-9": "Kosmy, Damiana", "28-9": "Marka, Wacława", "29-9": "Michała, Gabriela, Rafała", "30-9": "Zofii, Hieronima",
            "1-10": "Danuty, Remigiusza", "2-10": "Teofila, Dionizego", "3-10": "Teresy, Heliodora", "4-10": "Rozalii, Franciszka", "5-10": "Igora, Placyda",
            "6-10": "Artura, Brunona", "7-10": "Marii, Marka", "8-10": "Pelagii, Brygidy", "9-10": "Ludwika, Dionizego", "10-10": "Pauliny, Franciszka",
            "11-10": "Emilii, Aldony", "12-10": "Maksymiliana, Edwina", "13-10": "Edwarda, Teofila", "14-10": "Dominika, Bernarda", "15-10": "Jadwigi, Teresy",
            "16-10": "Aurelii, Gerarda", "17-10": "Wiktorii, Małgorzaty", "18-10": "Łukasza, Juliana", "19-10": "Piotra, Ziemowita", "20-10": "Ireny, Kleopatry",
            "21-10": "Urszuli, Hilarega", "22-10": "Filipa, Korduli", "23-10": "Marleny, Seweryna", "24-10": "Rafała, Marcina", "25-10": "Darii, Sambora",
            "26-10": "Lucjana, Ewarysta", "27-10": "Iwony, Sabiny", "28-10": "Szymona, Tadeusza", "29-10": "Euzebii, Wioletty", "30-10": "Zenobii, Przemysława", "31-10": "Łukasza, Urbana",
            "1-11": "Wszystkich Świętych", "2-11": "Zaduszki, Tobiasza", "3-11": "Huberta, Sylwii", "4-11": "Karola, Olgierda", "5-11": "Elżbiety, Sławomira",
            "6-11": "Feliksa, Leonarda", "7-11": "Antoniego, Ernesta", "8-11": "Seweryna, Bogdana", "9-11": "Urszuli, Teodora", "10-11": "Leny, Ludomira",
            "11-11": "Marcina, Bartłomieja", "12-11": "Renaty, Witolda", "13-11": "Mikołaja, Stanisława", "14-11": "Serafina, Rogera", "15-11": "Alberta, Leopolda",
            "16-11": "Gertrudy, Edmunda", "17-11": "Grzegorza, Salomei", "18-11": "Romana, Klaudyny", "19-11": "Elżbiety, Seweryna", "20-11": "Anatola, Sędzimira",
            "21-11": "Janusza, Konrada", "22-11": "Cecylii, Marka", "23-11": "Adelajdy, Klemensa", "24-11": "Flory, Jana", "25-11": "Erazma, Katarzyny",
            "26-11": "Delfiny, Sylwestra", "27-11": "Waleriana, Maksymiliana", "28-11": "Grzegorza, Lesława", "29-11": "Błażeja, Saturnina", "30-11": "Andrzeja, Maury",
            "1-12": "Natalii, Eligiusza", "2-12": "Balbiny, Bibianny", "3-12": "Franciszka, Ksawerego", "4-12": "Barbary, Krystiana", "5-12": "Saby, Krystyny",
            "6-12": "Mikołaja, Jasiu", "7-12": "Ambrożego, Marcina", "8-12": "Marii, Wirginiusza", "9-12": "Wiesława Leokadii", "10-12": "Julii, Adama",
            "11-12": "Damazego, Waldemara", "12-12": "Aleksandry, Joanny", "13-12": "Łucji, Otalii", "14-12": "Alfreda, Izydora", "15-12": "Niny, Celiny",
            "16-12": "Albiny, Zdzisławy", "17-12": "Olimpii, Łazarza", "18-12": "Gracjana, Bogusława", "19-12": "Dariusza, Gabrieli", "20-12": "Bogumiły, Dominika",
            "21-12": "Tomasza, Honoraty", "22-12": "Zenona, Honoraty", "23-12": "Wiktora, Sławomiry", "24-12": "Adama, Ewy", "25-12": "Boże Narodzenie, Anastazji",
            "26-12": "Szczepana, Dionizego", "27-12": "Jana, Żanety", "28-12": "Cezarego, Teofili", "29-12": "Dawida, Tomasza", "30-12": "Rainera, Eugeniusza", "31-12": "Sylwestra, Melanii"
        };
        const key = `${td.getDate()}-${td.getMonth() + 1}`;
        const imieniny = namedayList[key] || "";
        
        let headerText = `${daysPL[td.getDay()]}, ${td.getDate()} ${mPL[td.getMonth()]} ${td.getFullYear()} r.`;
        if (imieniny) {
            headerText += `<br><span style="font-size: 11px; font-weight: 500; opacity: 0.8;">Imieniny: ${imieniny}</span>`;
        }
        th.innerHTML = headerText;
    }

    refreshQuoteUI();

    // Event Listeners
    const btnRefresh = document.getElementById('refreshQuote');
    if (btnRefresh) btnRefresh.onclick = refreshQuoteUI;

    const btnExport = document.getElementById('exportBtn');
    if (btnExport) btnExport.onclick = () => journal.exportJSON();

    const fi = document.getElementById('fileInput');
    if (fi) fi.onchange = () => journal.importJSON(fi.files[0], renderCalendar);

    const btnShowAdd = document.getElementById('showAddQuote');
    if (btnShowAdd) btnShowAdd.onclick = () => {
        const p = document.getElementById('addQuotePanel');
        p.style.display = p.style.display === 'none' ? 'block' : 'none';
    };

    const qInp = document.getElementById('quoteInput');
    if (qInp) qInp.oninput = () => {
        document.getElementById('quoteCount').textContent = `${qInp.value.length} / 200`;
    };

    const btnSaveQ = document.getElementById('saveQuote');
    if (btnSaveQ) btnSaveQ.onclick = () => {
        journal.addCustomQuote(qInp.value);
        qInp.value = '';
        document.getElementById('addQuotePanel').style.display = 'none';
        refreshQuoteUI();
    };

    const mc = document.getElementById('modalClose');
    if (mc) mc.onclick = () => document.getElementById('calModal').classList.remove('is-open');

    const smv = document.getElementById('showMonthView');
    if (smv) smv.onclick = showMonthView;

    const cmm = document.getElementById('closeMonthModal');
    if (cmm) cmm.onclick = () => document.getElementById('monthOverlay').style.display = 'none';

    const prt = document.getElementById('printMonth');
    if (prt) prt.onclick = () => window.print();
});
