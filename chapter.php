<?php
$id = $_GET["id"] ?? "";
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $id)) { http_response_code(400); exit("Błędne id."); }

$dataPath = __DIR__ . "/data/$id.json";
if (!file_exists($dataPath)) { http_response_code(404); exit("Brak rozdziału."); }

$data = json_decode(file_get_contents($dataPath), true);
$chapterMeta = json_decode(file_get_contents(__DIR__ . "/data/chapters.json"), true);
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
?>
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><?=htmlspecialchars($data["title"] ?? "Rozdział")?></title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>

<header class="topHeader">
  <div class="topHeader__inner">
    <a class="back" href="index.php" aria-label="Wróć">
      <span class="icon icon--back" aria-hidden="true"></span>
      <span class="back__txt">Rozdziały</span>
    </a>
    <div class="brand brand--small">
      <div class="brand__title">TERAPIA</div>
      <div class="brand__subtitle"><?=htmlspecialchars($data["title"] ?? "")?></div>
    </div>
  </div>
</header>

<div class="readerBar">
  <div class="readerBar__shell">
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
  </div>
</div>

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
  </aside>

  <section class="contentMain">
    <article class="article" id="article">
      <h1 class="article__title"><?=htmlspecialchars($data["title"] ?? "")?></h1>

      <?php if(!empty($meta["subtitle"])): ?>
        <div class="article__meta"><?=htmlspecialchars($meta["subtitle"])?></div>
      <?php endif; ?>

      <?php if(!empty($data["lead"])): ?>
        <p class="lead"><?=htmlspecialchars($data["lead"])?></p>
      <?php endif; ?>

      <?php if($mainImage): ?>
        <figure class="mainFigure">
          <img src="<?=$mainImage?>" alt="Komiks">
        </figure>
      <?php endif; ?>

      <?php if(!empty($meta["notebookUrl"])): ?>
        <div class="noteBox">
          <div class="noteBox__title">Materiały dodatkowe</div>
          <div class="noteBox__text">Jakby ktoś jednak wolał poczytać – rozdział na czytnik oraz notatnik roboczy do tego rozdziału.</div>
          <a class="noteBox__link" href="<?=htmlspecialchars($meta["notebookUrl"])?>" target="_blank" rel="noreferrer">Źródło w bibliotece</a>
          <?php if(!empty($meta["pdfUrl"])): ?>
            <a class="noteBox__link" href="<?=htmlspecialchars($meta["pdfUrl"])?>" target="_blank" rel="noreferrer">Pobierz PDF</a>
          <?php endif; ?>
        </div>
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

  <?php if(count($files) > 0): ?>
    <aside class="sideNav sideNav--right">
      <div class="glassPanel glassPanel--sticky glassPanel--small">
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
    </aside>
  <?php endif; ?>

</main>

<script src="assets/app.js"></script>
</body>
</html>
