// Local video controls only. No tracking, storage or third-party requests.
(() => {
  const videos = [...document.querySelectorAll('.demo-film video')];
  for (const video of videos) {
    video.addEventListener('play', () => {
      for (const other of videos) if (other !== video) other.pause();
    });
  }
  for (const nav of document.querySelectorAll('.demo-chapters')) {
    const video = document.getElementById(nav.dataset.video);
    if (!(video instanceof HTMLVideoElement)) continue;
    const buttons = [...nav.querySelectorAll('button[data-seek]')];
    for (const button of buttons) {
      button.disabled = false;
      button.addEventListener('click', () => {
        video.currentTime = Number(button.dataset.seek);
        // A browser may require its native play control; leave that usable.
        video.play().catch(() => {});
      });
    }
    const update = () => {
      const active = buttons.findLast(button => video.currentTime >= Number(button.dataset.seek));
      for (const button of buttons) button.setAttribute('aria-pressed', String(button === active));
    };
    video.addEventListener('timeupdate', update);
    update();
  }
})();
