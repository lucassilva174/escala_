// youtube-init.js
function onYouTubeIframeAPIReady() {
  const player = new YT.Player("youtubePlayer", {
    height: "360",
    width: "640",
    videoId: "",
    playerVars: { autoplay: 1 },
    events: {
      onReady: (event) => {
        window.player = event.target;
        if (window.configurarPlayerYT) {
          window.configurarPlayerYT(window.player);
        }
      },
    },
  });
  console.log("VideoyoutubeInit", onYouTubeIframeAPIReady);
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
