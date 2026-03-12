<?php
$chapters = json_decode(@file_get_contents(__DIR__ . "/data/chapters.json"), true);
if ($chapters && isset($chapters["chapters"]) && is_array($chapters["chapters"])) {
    usort($chapters["chapters"], function($a, $b) { return strcmp($a['date'] ?? '', $b['date'] ?? ''); });
}
?><!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TERAPIA – Dashboard</title>
  <link rel="stylesheet" href="assets/style.css?v=<?=time()?>">
</head>
<body>

<header class="topHeader animate-in">
  <div class="topHeader__inner">
    <div class="brand">
      <div class="brand__title">TERAPIA</div>
      <div id="todayHeader" class="brand__subtitle">Wczytywanie daty...</div>
    </div>
    <div class="topHeader__actions">
      <button id="themeToggle" class="theme-toggle" title="Przełącz motyw" style="margin-right:10px;">🌓</button>
      <button class="calBtn calBtn--sm" id="showMonthView">Miesiąc</button>
      <button class="calBtn calBtn--sm" id="exportBtn">Eksportuj</button>
      <button class="calBtn calBtn--sm" onclick="document.getElementById('fileInput').click()">Importuj</button>
      <input type="file" id="fileInput" style="display:none" accept=".json">
    </div>
  </div>
</header>

<main class="page">
  
  <div class="dashboard-grid">
    <!-- Kolumna Lewa: Kalendarz i Dziennik -->
    <div class="animate-in" style="animation-delay: 0.1s;">
      
      <!-- Witaj / Cytat -->
      <section class="section" style="margin-top:0;">
        <div class="quoteCard">
          <div class="quoteCard__text" id="quoteText">„Wszystko, czego potrzebujesz, jest już w Tobie.”</div>
          <div class="quoteCard__actions">
            <button class="calBtn calBtn--sm" id="refreshQuote">Inny cytat</button>
            <button class="calBtn calBtn--sm" id="showAddQuote">Dodaj własny</button>
          </div>
          <div id="addQuotePanel" style="display:none; margin-top:20px;">
            <div class="quoteCard__add">
              <textarea id="quoteInput" placeholder="Twoja złota myśl..." maxlength="200"></textarea>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <span id="quoteCount" style="font-size:12px; color:var(--muted);">0 / 200</span>
                <button class="calBtn calBtn--sm" id="saveQuote" style="background:var(--accentGradient); border:none;">Zapisz</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Statystyki Szybkie -->
      <div class="statsRow" style="margin-top:24px;">
        <div class="statBox">
          <div class="statBox__val" id="statDays">0</div>
          <div class="statBox__lbl">Dni z wpisem</div>
        </div>
        <div class="statBox">
          <div class="statBox__val" id="statAvg">0</div>
          <div class="statBox__lbl">Śr. obj / dzień</div>
        </div>
        <div class="statBox">
          <div class="statBox__val" style="font-size:24px; padding-top:10px;" id="statLast">—</div>
          <div class="statBox__lbl">Ostatni wpis</div>
        </div>
      </div>

      <!-- Kalendarz -->
      <div class="calContainer" style="margin-top:24px;">
        <div class="calHeader">
          <h2 class="calHeader__title" id="monthName">Ładowanie...</h2>
          <div class="calHeader__controls">
            <button class="calBtn" onclick="prevMonth()" title="Poprzedni miesiąc">‹</button>
            <button class="calBtn" onclick="nextMonth()" title="Następny miesiąc">›</button>
          </div>
        </div>
        
        <div class="calGridNames" style="display:grid; grid-template-columns: repeat(7, 1fr); margin-bottom:12px; text-align:center;">
          <div class="calDayName">Pon</div><div class="calDayName">Wt</div><div class="calDayName">Śr</div><div class="calDayName">Czw</div><div class="calDayName">Pt</div><div class="calDayName">Sob</div><div class="calDayName">Nie</div>
        </div>
        <div class="calGrid" id="calGrid"></div>
      </div>

    </div>

    <!-- Kolumna Prawa: Biblioteka i Skróty -->
    <div class="animate-in" style="animation-delay: 0.2s;">
      <section class="section" style="margin-top:0;">
        <h2 class="sectionTitle">Biblioteka</h2>
        <div style="display:flex; flex-direction:column; gap:16px;">
          <?php foreach(($chapters["chapters"] ?? []) as $c): ?>
            <a class="card" href="chapter.php?id=<?=htmlspecialchars($c["id"])?>" style="padding:20px;">
              <div class="card__meta" style="font-size:11px; font-weight:700; color:var(--accent); margin-bottom:4px;">
                <?= !empty($c['date']) ? date("d.m.Y", strtotime($c['date'])) : "" ?>
              </div>
              <div class="card__title" style="font-size:16px;"><?=htmlspecialchars($c["title"])?></div>
              <?php if(!empty($c["subtitle"])): ?>
                <div class="card__meta" style="font-size:12px;"><?=htmlspecialchars($c["subtitle"])?></div>
              <?php endif; ?>
              <div class="card__cta"><span>Czytaj</span><span class="chev">›</span></div>
            </a>
          <?php endforeach; ?>
        </div>
      </section>
      
      <div class="glassPanel" style="margin-top:30px; padding:24px;">
        <div class="sideNav__title">Jak notować?</div>
        <p style="font-size:13px; color:var(--muted); line-height:1.5; margin-bottom: 12px;">
          Regularne prowadzenie dzienniczka to kluczowy element procesu zdrowienia. Kilka wskazówek:
        </p>
        <ul style="font-size:12px; color:var(--muted); line-height:1.6; padding-left:18px; margin:0;">
          <li><strong>Systematyczność:</strong> Wypełniaj dzienniczek codziennie, najlepiej wieczorem, podsumowując dzień.</li>
          <li><strong>Szczerość:</strong> Zaznaczaj wszystkie objawy, które faktycznie odczułeś – nie ma "złych" odpowiedzi.</li>
          <li><strong>Krótkie Notatki:</strong> W polu opisu zapisuj tylko najważniejsze emocje lub zdarzenia (maks. 300 znaków).</li>
          <li><strong>Kopia Zapasowa:</strong> Pamiętaj o regularnym korzystaniu z przycisku <strong>Eksportuj</strong>, aby zachować historię.</li>
        </ul>
      </div>
    </div>
  </div>

</main>

<!-- Modale (bez zmian w ID) -->
<div class="calModal" id="monthOverlay" style="display:none;">
  <div class="calModal__content" style="max-width:95vw; width:fit-content;">
    <div class="calModal__header">
      <div class="calModal__title" id="monthModalTitle">Podsumowanie</div>
      <div style="display:flex; gap:10px;">
        <button class="calBtn calBtn--sm" id="printMonth">Drukuj</button>
        <button class="rbBtn" id="closeMonthModal">✕</button>
      </div>
    </div>
    <div class="calModal__body" style="padding:20px; overflow-x:auto;">
      <div id="monthTableContainer"></div>
    </div>
  </div>
</div>

<div class="calModal" id="calModal">
  <div class="calModal__content">
    <div class="calModal__header">
      <div class="calModal__title" id="modalTitle">Notatki</div>
      <button class="rbBtn" id="modalClose">✕</button>
    </div>
    <div class="calModal__body" id="modalBody"></div>
  </div>
</div>

<script src="assets/journal.js"></script>
<script src="assets/calendar.js"></script>
</body>
</html>


