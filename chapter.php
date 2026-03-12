<?php
$id = $_GET["id"] ?? "";
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $id)) { http_response_code(400); exit("Błędne id."); }

$dataPath = __DIR__ . "/data/$id.json";
if (!file_exists($dataPath)) { http_response_code(404); exit("Brak rozdziału."); }

$data = json_decode(@file_get_contents($dataPath), true);
if (!$data) {
  die("Błąd: Nie można wczytać danych rozdziału. Sprawdź czy plik JSON istnieje.");
}
$chapterMeta = json_decode(@file_get_contents(__DIR__ . "/data/chapters.json"), true);
// Chronological sort
if (isset($chapterMeta["chapters"]) && is_array($chapterMeta["chapters"])) {
    usort($chapterMeta["chapters"], function($a, $b) { return strcmp($a['date'] ?? '', $b['date'] ?? ''); });
}

$meta = null;
foreach(($chapterMeta["chapters"] ?? []) as $c){ if(($c["id"] ?? "") === $id){ $meta = $c; break; } }

$mediaDirFs = __DIR__ . "/media/$id";
$mediaDirWeb = "media/$id";

$images = [];
$files = [];

if (is_dir($mediaDirFs)) {
  $all = scandir($mediaDirFs);
  foreach ($all as $file) {
    if ($file === "." || $file === "..") continue;
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $web = $mediaDirWeb . "/" . $file;
    if (in_array($ext, ["jpg","jpeg","png","webp"])) $images[] = $web;
    else $files[] = $web;
  }
}

function icon_for($path){
  $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
  if ($ext === "pdf") return "pdf";
  if ($ext === "epub") return "epub";
  if ($ext === "doc" || $ext === "docx") return "doc";
  if ($ext === "mp3" || $ext === "wav" || $ext === "m4a") return "audio";
  if ($ext === "zip") return "zip";
  return "file";
}

$mainCandidates = ["main.png","main.jpg","main.jpeg","main.webp"];
$mainImage = null;
foreach($mainCandidates as $cand){
  if (file_exists($mediaDirFs . "/" . $cand)) { $mainImage = $mediaDirWeb . "/" . $cand; break; }
}
$extraImages = array_values(array_filter($images, function($p) use ($mainImage){
  return $mainImage ? ($p !== $mainImage) : true;
}));

// Szukamy pliku MP3 do lektora
$chapterAudio = null;
foreach ($files as $f) {
  if (strtolower(pathinfo($f, PATHINFO_EXTENSION)) === "mp3") {
    $chapterAudio = $f;
    break;
  }
}
?><!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><?=htmlspecialchars($data["title"] ?? "Rozdział")?></title>
  <link rel="stylesheet" href="assets/style.css?v=<?=time()?>">
</head>
<body>

<header class="topHeader">
  <div class="topHeader__inner">
    <div class="topHeader__left">
      <a class="back" href="index.php" aria-label="Strona główna">
        <span class="icon icon--home" aria-hidden="true"></span>
      </a>
      <div class="brand brand--small">
        <div class="brand__title">TERAPIA</div>
        <div class="brand__subtitle"><?=htmlspecialchars($data["title"] ?? "")?></div>
      </div>
    </div>

    <!-- Centered Reader Controls -->
    <div class="readerControls">
      <button class="rbBtn" onclick="reader.play()" title="Czytaj" aria-label="Czytaj">
        <span class="icon icon--play" aria-hidden="true"></span>
      </button>
      <button class="rbBtn" onclick="reader.pause()" title="Pauza" aria-label="Pauza">
        <span class="icon icon--pause" aria-hidden="true"></span>
      </button>
      <button class="rbBtn" onclick="reader.resume()" title="Wznów" aria-label="Wznów">
        <span class="icon icon--resume" aria-hidden="true"></span>
      </button>
      <button class="rbBtn" onclick="reader.stop()" title="Stop" aria-label="Stop">
        <span class="icon icon--stop" aria-hidden="true"></span>
      </button>
      <div class="rbSep"></div>
      <div class="rbSpeed">
        <div class="rbLabel">Tempo</div>
        <input id="speed" type="range" min="0.7" max="1.6" step="0.1" value="1.1" aria-label="Tempo czytania">
        <div id="speedValue" class="rbValue">1.1</div>
      </div>
      <?php if($chapterAudio): ?>
        <div class="rbBadge" title="Dostępne autentyczne nagranie lektorskie">HQ Voice</div>
      <?php endif; ?>
    </div>
    <div class="topHeader__actions">
      <button id="themeToggle" class="theme-toggle" title="Przełącz motyw">🌓</button>
    </div>
  </div>
</header>


<main class="page page--chapter">
  <aside class="sideNav sideNav--left">
    <div class="glassPanel glassPanel--sticky">
      <div class="sideNav__title">Rozdziały</div>
      <div class="chapterList">
        <?php foreach(($chapterMeta["chapters"] ?? []) as $c): ?>
          <a class="chapterItem <?=($c["id"] === $id ? "is-active" : "")?>" href="chapter.php?id=<?=htmlspecialchars($c["id"])?>">
            <span class="chapterItem__title"><?=htmlspecialchars($c["title"])?></span>
            <?php if(!empty($c["subtitle"])): ?>
              <span class="chapterItem__meta"><?=htmlspecialchars($c["subtitle"])?></span>
            <?php endif; ?>
          </a>
        <?php endforeach; ?>
      </div>
    </div>

    <!-- Mini Kalendarz -->
    <div class="glassPanel glassPanel--sticky" style="margin-top: 18px; top: 380px;">
      <div class="sideNav__title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Harmonogram</span>
      </div>
      <div style="font-size:11px; color:rgba(255,255,255,.6); margin-bottom:10px; text-align:center;" id="monthName"></div>
      <div class="calGrid calGrid--mini" id="calGrid"></div>
    </div>
  </aside>

  <section class="contentMain">
    <article class="article" id="article">
      <h1 class="article__title"><?=htmlspecialchars($data["title"] ?? "")?></h1>

      <?php if(!empty($meta["subtitle"])): ?>
        <div class="article__meta">
           <span style="font-weight: 700; color: var(--accent);"><?= !empty($meta['date']) ? date("d.m.Y", strtotime($meta['date'])) : "" ?></span>
           <?= !empty($meta['date']) ? " &nbsp;•&nbsp; " : "" ?>
           <?= htmlspecialchars($meta["subtitle"]) ?>
        </div>
      <?php endif; ?>

      <?php if(!empty($data["author"])): ?>
        <div class="article__author" style="font-size: 14px; font-weight: 600; color: var(--muted); margin-top: -10px; margin-bottom: 20px;">
          Autor: <?=htmlspecialchars($data["author"])?>
        </div>
      <?php endif; ?>

      <?php if(!empty($data["lead"])): ?>
        <p class="lead"><?=htmlspecialchars($data["lead"])?></p>
      <?php endif; ?>

      <?php if($mainImage): ?>
        <figure class="mainFigure">
          <img src="<?=$mainImage?>" alt="Komiks">
        </figure>
      <?php endif; ?>


      <?php foreach(($data["sections"] ?? []) as $s): ?>
        <section class="section">
          <h2><?=htmlspecialchars($s["title"] ?? "")?></h2>

          <?php foreach(($s["paragraphs"] ?? []) as $p): ?>
            <p><?=htmlspecialchars($p)?></p>
          <?php endforeach; ?>

          <?php if(!empty($s["bullets"])): ?>
            <ul>
              <?php foreach($s["bullets"] as $b): ?>
                <li><?=htmlspecialchars($b)?></li>
              <?php endforeach; ?>
            </ul>
          <?php endif; ?>

          <?php foreach(($s["after"] ?? []) as $p): ?>
            <p><?=htmlspecialchars($p)?></p>
          <?php endforeach; ?>

          <?php foreach(($s["quotes"] ?? []) as $q): ?>
            <blockquote class="quote"><?=htmlspecialchars($q)?></blockquote>
          <?php endforeach; ?>
        </section>
      <?php endforeach; ?>

      <?php if(count($extraImages) > 0): ?>
        <section class="section">
          <h2>Media</h2>
          <div class="carousel" id="carousel" aria-label="Galeria">
            <div class="carousel__track" id="carouselTrack">
              <?php foreach($extraImages as $img): ?>
                <div class="carousel__slide">
                  <img src="<?=$img?>" alt="Media">
                </div>
              <?php endforeach; ?>
            </div>

            <button class="carBtn carBtn--prev" type="button" onclick="gallery.prev()" aria-label="Poprzednie">
              <span class="icon icon--chevL" aria-hidden="true"></span>
            </button>
            <button class="carBtn carBtn--next" type="button" onclick="gallery.next()" aria-label="Następne">
              <span class="icon icon--chevR" aria-hidden="true"></span>
            </button>

            <div class="carousel__dots" id="carouselDots" aria-hidden="true"></div>
          </div>
        </section>
      <?php endif; ?>
    </article>
  </section>

  <?php if(count($files) > 0 || !empty($data["links"])): ?>
    <aside class="sideNav sideNav--right">
      <div class="glassPanel glassPanel--sticky glassPanel--small" style="display:flex; flex-direction:column; gap:20px;">
        
        <?php if(count($files) > 0): ?>
          <div>
            <div class="sideNav__title">Pliki</div>
            <div class="files files--side">
              <?php foreach($files as $f): $icon = icon_for($f); ?>
                <a class="fileRow" href="<?=$f?>" download>
                  <span class="fileRow__icon icon icon--<?=$icon?>" aria-hidden="true"></span>
                  <span class="fileRow__name"><?=htmlspecialchars(basename($f))?></span>
                  <span class="fileRow__dl">Pobierz</span>
                </a>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endif; ?>

        <?php if(!empty($data["links"])): ?>
          <div>
            <div class="sideNav__title">Linki</div>
            <div class="links-list">
              <?php foreach(($data["links"] ?? []) as $l): 
                $url = $l["url"] ?? "";
                $isVideo = (strpos($url, 'share.google') !== false || strpos($url, 'photos.app.goo.gl') !== false || strpos($url, 'youtube.com') !== false || strpos($url, 'youtu.be') !== false);
                
                // YouTube Thumb Logic
                $thumb = null;
                if (preg_match('/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i', $url, $match)) {
                  $thumb = "https://img.youtube.com/vi/{$match[1]}/mqdefault.jpg";
                } elseif (strpos($url, 'share.google') !== false) {
                  // For Google Photos, we show a generic video thumbnail icon if we can't get a direct preview easily
                  $thumb = "assets/video_placeholder.png"; 
                }
              ?>
                <a class="linkCard <?= $isVideo ? 'linkCard--video' : '' ?>" href="<?=htmlspecialchars($url)?>" target="_blank" rel="noreferrer">
                  <?php if($isVideo && $thumb): ?>
                    <div class="linkCard__thumb">
                      <img src="<?= $thumb ?>" alt="Miniatura wideo" onerror="this.src='media/default_video.png'">
                      <div class="linkCard__playOverlay">▶</div>
                    </div>
                  <?php endif; ?>
                  <div class="linkCard__body">
                    <div class="linkCard__title">
                      <?php if(!$isVideo): ?><span class="icon icon--link" style="font-size:12px; margin-right:5px;">🔗</span><?php endif; ?>
                      <?=htmlspecialchars($l["title"])?>
                    </div>
                    <?php if(!empty($l["comment"])): ?>
                      <div class="linkCard__comment"><?=htmlspecialchars($l["comment"])?></div>
                    <?php endif; ?>
                  </div>
                  <?php if(!$isVideo): ?>
                    <span class="icon" style="font-size:12px; opacity:0.5;">↗</span>
                  <?php endif; ?>
                </a>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endif; ?>

      </div>
    </aside>
  <?php endif; ?>

</main>

<!-- Modal na szczegóły dnia -->
<div class="calModal" id="calModal">
  <div class="calModal__content">
    <div class="calModal__header">
      <div class="calModal__title" id="modalTitle">Notatki</div>
      <button class="rbBtn" id="modalClose">✕</button>
    </div>
    <div class="calModal__body" id="modalBody">
      <!-- Ciało modala -->
    </div>
  </div>
</div>

<script>
  window.CHAPTER_AUDIO = <?php echo $chapterAudio ? json_encode($chapterAudio) : 'null'; ?>;
</script>
<script src="assets/journal.js"></script>
<script src="assets/app.js"></script>
<script src="assets/calendar.js"></script>
</body>
</html>
