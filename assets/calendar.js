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
    const mPL = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
    const th = document.getElementById('todayHeader');
    if (th) th.textContent = `${td.getDate()} ${mPL[td.getMonth()]} ${td.getFullYear()} r.`;

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
