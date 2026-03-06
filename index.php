<?php
$chapters = json_decode(file_get_contents(__DIR__ . "/data/chapters.json"), true);
?>
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Rozdziały</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>

<header class="topHeader">
  <div class="topHeader__inner">
    <div class="brand">
      <div class="brand__title">TERAPIA</div>
      <div class="brand__subtitle">Czytnik rozdziałów</div>
    </div>
  </div>
</header>

<main class="page page--listing">
  <aside class="sideNav sideNav--left sideNav--standalone">
    <div class="glassPanel glassPanel--sticky">
      <div class="sideNav__title">Rozdziały</div>
      <div class="chapterList">
        <?php foreach(($chapters["chapters"] ?? []) as $c): ?>
          <a class="chapterItem is-active" href="chapter.php?id=<?=htmlspecialchars($c["id"])?>">
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
    <section class="hero">
      <h1>Rozdziały</h1>
      <p class="muted">Każdy rozdział ma własne media, pliki do pobrania i czytanie z podświetlaniem zdań.</p>
    </section>

    <section class="grid">
      <?php foreach(($chapters["chapters"] ?? []) as $c): ?>
        <a class="card" href="chapter.php?id=<?=htmlspecialchars($c["id"])?>">
          <div class="card__title"><?=htmlspecialchars($c["title"])?></div>
          <?php if(!empty($c["subtitle"])): ?>
            <div class="card__meta"><?=htmlspecialchars($c["subtitle"])?></div>
          <?php endif; ?>
          <div class="card__cta"><span>Otwórz</span><span class="chev">›</span></div>
        </a>
      <?php endforeach; ?>
    </section>
  </section>
</main>

</body>
</html>
