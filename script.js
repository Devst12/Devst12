
document.addEventListener('DOMContentLoaded', function () {
  const songs = [
    {
      title: 'Canon in D Major',
      artist: 'Johann Pachelbel',
      cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      audio: 'media/videoplayback.mp3',
      isFavorite: false
    },
    {
      title: 'Greensleeves',
      artist: 'Traditional',
      cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      audio: 'media/videoplayback.mp3',
      isFavorite: false
    },
    {
      title: 'Clair de Lune',
      artist: 'Claude Debussy',
      cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      audio: 'media/videoplayback.mp3',
      isFavorite: false
    },
    {
      title: 'Ode to Joy',
      artist: 'Ludwig van Beethoven',
      cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      audio: 'media/videoplayback.mp3',
      isFavorite: false
    },
    {
      title: 'Amazing Grace',
      artist: 'John Newton',
      cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      audio: 'media/videoplayback.mp3',
      isFavorite: false
    }
  ];

  // Initialize audio player
  let audioPlayer = document.createElement('audio');
  audioPlayer.id = 'audio-player';
  audioPlayer.preload = 'auto';
  audioPlayer.volume = 0.5;
  document.body.appendChild(audioPlayer);

  // Essential DOM elements
  const elements = {
    albumCover: document.getElementById('album-cover'),
    songTitle: document.getElementById('song-title'),
    songArtist: document.getElementById('song-artist'),
    favoriteButton: document.getElementById('favorite-button'),
    playButton: document.getElementById('play-button'),
    playIcon: document.getElementById('play-icon'),
    pauseIcon: document.getElementById('pause-icon'),
    prevButton: document.getElementById('prev-button'),
    nextButton: document.getElementById('next-button'),
    shuffleButton: document.getElementById('shuffle-button'),
    repeatButton: document.getElementById('repeat-button'),
    progressBar: document.getElementById('progress-bar'),
    progress: document.getElementById('progress'),
    currentTimeEl: document.getElementById('current-time'),
    durationEl: document.getElementById('duration'),
    playlistSongs: document.getElementById('playlist-songs'),
    themeToggleButton: document.getElementById('theme-toggle'),
    mainContent: document.querySelector('.main-content'),
    sidebar: document.querySelector('.sidebar'),
    hamburgerIcon: document.querySelector('.hamburger-icon'),
    libraryNav: document.getElementById('library-nav'),
    homeNav: document.getElementById('home-nav'),
    library: document.getElementById('library'),
    nowPlaying: document.getElementById('now-playing'),
    playlist: document.querySelector('.playlist'),
    librarySongs: document.getElementById('library-songs'),
    relaxNav: document.getElementById('relax-nav'),
    focusNav: document.getElementById('focus-nav'),
    upliftNav: document.getElementById('uplift-nav'),
    likedSongsNav: document.getElementById('liked-songs-nav'),
    chillVibesNav: document.getElementById('chill-vibes-nav'),
    visualizer: document.getElementById('visualizer'),
    volumeSlider: document.querySelector('.volume-slider'),
    volumeProgress: document.querySelector('.volume-progress'),
    volumeIcon: document.getElementById('volume-icon'),
    muteIcon: document.getElementById('mute-icon')
  };

  // Check for critical elements
  const requiredElements = [
    'albumCover', 'songTitle', 'songArtist', 'playButton', 'playIcon', 'pauseIcon',
    'prevButton', 'nextButton', 'progressBar', 'progress', 'currentTimeEl', 'durationEl',
    'playlistSongs', 'librarySongs', 'visualizer', 'volumeSlider', 'volumeProgress',
    'volumeIcon', 'muteIcon'
  ];
  for (const key of requiredElements) {
    if (!elements[key]) {
      console.error(`Critical element '${key}' missing.`);
      return;
    }
  }

  const defaultCover = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400';
  let currentSongIndex = 0;
  let isPlaying = false;
  let animationId;
  let visualizerId;
  let isShuffling = false;
  let isRepeating = false;
  let librarySongs = [...songs];
  let playlists = {
    relax: [],
    focus: [],
    uplift: [],
    likedSongs: [],
    chillVibes: []
  };
  let audioContext;
  let analyser;
  let source;
  let lastClickTime = 0;
  let lastDebounceLog = 0;
  let isMetadataLoaded = false;

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function extractColorsFromCover(coverUrl, callback) {
    const baseHue = 180 + Math.random() * 120;
    const color1 = `hsl(${baseHue}, 30%, 85%)`;
    const color2 = `hsl(${baseHue + 20}, 25%, 90%)`;
    callback([color1, color2]);
  }

  function initVisualizer() {
    if (audioContext) return;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaElementSource(audioPlayer);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      analyser.fftSize = 64;
    } catch (error) {
      console.error('Failed to initialize audio visualizer:', error);
    }
  }

  function updateVisualizer() {
    if (!isPlaying || !analyser) {
      visualizerId = null;
      return;
    }

    const bars = elements.visualizer.querySelectorAll('.visualizer-bar');
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    bars.forEach((bar, index) => {
      const value = dataArray[index % dataArray.length] || 0;
      const height = (value / 255) * 35 + 6;
      bar.style.height = `${height}px`;
    });

    visualizerId = requestAnimationFrame(updateVisualizer);
  }

  function syncUIState() {
    isPlaying = !audioPlayer.paused && !audioPlayer.ended;
    elements.playIcon.style.display = isPlaying ? 'none' : 'block';
    elements.pauseIcon.style.display = isPlaying ? 'block' : 'none';
  }

  function playSong() {
    if (!songs[currentSongIndex].audio) {
      console.error('No audio source for song:', songs[currentSongIndex].title);
      elements.durationEl.textContent = 'No Audio';
      syncUIState();
      return;
    }

    // Ensure audio is ready
    const attemptPlay = () => {
      // Toggle mute to satisfy browser restrictions
      audioPlayer.muted = true;
      setTimeout(() => {
        audioPlayer.muted = false;
      }, 50);

      // Resume AudioContext
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
          console.error('AudioContext resume failed:', err);
        });
      }

      const playPromise = audioPlayer.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`Playing: ${songs[currentSongIndex].title}`);
          isPlaying = true;
          animationId = requestAnimationFrame(updateProgress);
          if (analyser && !visualizerId) {
            visualizerId = requestAnimationFrame(updateVisualizer);
          }
          syncUIState();
        }).catch(error => {
          console.error(`Playback failed for ${songs[currentSongIndex].title}:`, error.message);
          if (error.name === 'NotAllowedError') {
            console.warn('Autoplay blocked by browser.');
          }
          elements.durationEl.textContent = 'Error';
          syncUIState();
        });
      }
    };

    if (audioPlayer.readyState >= 3 && isMetadataLoaded) {
      attemptPlay();
    } else {
      audioPlayer.oncanplay = () => {
        console.log(`Can play: ${songs[currentSongIndex].title}`);
        attemptPlay();
        audioPlayer.oncanplay = null;
      };
      audioPlayer.onerror = () => {
        console.error(`Load error for ${songs[currentSongIndex].title}: ${songs[currentSongIndex].audio}`);
        elements.durationEl.textContent = 'File Not Found';
        isMetadataLoaded = false;
        syncUIState();
        audioPlayer.onerror = null;
      };
    }
  }

  function pauseSong() {
    audioPlayer.pause();
    isPlaying = false;
    cancelAnimationFrame(animationId);
    cancelAnimationFrame(visualizerId);
    visualizerId = null;
    if (audioContext) {
      audioContext.suspend().catch(err => {
        console.error('AudioContext suspend failed:', err);
      });
    }
    syncUIState();
  }

  function updateProgress() {
    if (!isPlaying) return;

    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration || 0;
    elements.currentTimeEl.textContent = formatTime(currentTime);

    if (duration) {
      const progressPercentage = (currentTime / duration) * 100;
      elements.progress.style.width = `${progressPercentage}%`;
    }

    if (currentTime >= duration && duration > 0) {
      if (isRepeating) {
        audioPlayer.currentTime = 0;
        playSong();
      } else {
        nextSong();
      }
      return;
    }

    animationId = requestAnimationFrame(updateProgress);
  }

  function updateNextSong() {
    const nextIndex = isShuffling
      ? Math.floor(Math.random() * songs.length)
      : (currentSongIndex + 1) % songs.length;

    const playlistItems = document.querySelectorAll('.playlist-song');
    playlistItems.forEach((item, i) => {
      const isNext = i === nextIndex && i !== currentSongIndex;
      item.classList.toggle('next-song', isNext);
      if (isNext && isShuffling) {
        item.style.backgroundColor = '#444444';
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          item.style.backgroundColor = '';
        }, 2000);
      }
    });
  }

  function loadSong(index, autoPlay = true) {
    if (index < 0 || index >= songs.length) {
      console.error('Invalid song index:', index);
      return;
    }

    const song = songs[index];
    currentSongIndex = index;

    // Reset and recreate audio player to avoid caching issues
    audioPlayer.pause();
    audioPlayer.remove();
    audioPlayer = document.createElement('audio');
    audioPlayer.id = 'audio-player';
    audioPlayer.preload = 'auto';
    audioPlayer.volume = elements.volumeProgress.offsetWidth / elements.volumeSlider.offsetWidth;
    document.body.appendChild(audioPlayer);

    // Reset state
    isPlaying = false;
    isMetadataLoaded = false;
    cancelAnimationFrame(animationId);
    cancelAnimationFrame(visualizerId);
    visualizerId = null;
    elements.durationEl.textContent = 'Loading...';
    elements.currentTimeEl.textContent = '0:00';
    elements.progress.style.width = '0%';

    // Load new audio
    audioPlayer.src = `./${song.audio}`;
    audioPlayer.load();

    // Update UI
    elements.albumCover.style.backgroundImage = `url('${song.cover || defaultCover}')`;
    elements.songTitle.textContent = song.title || 'Unknown Title';
    elements.songArtist.textContent = song.artist || 'Unknown Artist';
    if (elements.favoriteButton) {
      elements.favoriteButton.classList.toggle('favorited', song.isFavorite);
    }

    extractColorsFromCover(song.cover || defaultCover, (colors) => {
      elements.mainContent.style.background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
    });

    audioPlayer.onloadedmetadata = () => {
      isMetadataLoaded = true;
      song.duration = audioPlayer.duration;
      elements.durationEl.textContent = formatTime(audioPlayer.duration);
      console.log(`Metadata loaded for ${song.title}: Duration ${formatTime(audioPlayer.duration)}`);
      if (autoPlay) {
        playSong();
      }
    };

    audioPlayer.onerror = () => {
      console.error(`Failed to load audio: ${song.audio}`);
      elements.durationEl.textContent = 'File Not Found';
      isMetadataLoaded = false;
      syncUIState();
    };

    updateNextSong();
    updateRecentlyPlayed(song);
    initPlaylist();
    initLibrary();
    syncUIState();
  }

  function prevSong() {
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    loadSong(currentSongIndex, true);
  }

  function nextSong() {
    if (isShuffling) {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * songs.length);
      } while (newIndex === currentSongIndex && songs.length > 1);
      currentSongIndex = newIndex;
    } else {
      currentSongIndex = (currentSongIndex + 1) % songs.length;
    }
    loadSong(currentSongIndex, true);
  }

  function updateRecentlyPlayed(song) {
    const recentlyPlayedContainer = document.getElementById('recently-played-songs');
    const existingItems = recentlyPlayedContainer.querySelectorAll('.recently-played-item');
    existingItems.forEach(item => {
      if (item.dataset.title === song.title && item.dataset.artist === song.artist) {
        item.remove();
      }
    });

    const item = document.createElement('div');
    item.className = 'recently-played-item';
    item.dataset.title = song.title;
    item.dataset.artist = song.artist;
    item.innerHTML = `
      <div class="recently-played-cover" style="background-image: url('${song.cover || defaultCover}');"></div>
      <div class="recently-played-info">
        <div class="recently-played-title">${song.title}</div>
        <div class="recently-played-artist">${song.artist}</div>
      </div>
    `;
    item.addEventListener('click', () => {
      const index = songs.findIndex(s => s.title === song.title && s.artist === song.artist);
      if (index !== -1) {
        currentSongIndex = index;
        loadSong(currentSongIndex, true);
      }
    });
    recentlyPlayedContainer.prepend(item);

    while (recentlyPlayedContainer.children.length > 5) {
      recentlyPlayedContainer.removeChild(recentlyPlayedContainer.lastChild);
    }
  }

  function initLibrary() {
    elements.librarySongs.innerHTML = '';
    librarySongs.forEach((song, index) => {
      const songElement = document.createElement('div');
      songElement.className = 'library-song';
      const duration = song.duration ? formatTime(song.duration) : '--:--';
      songElement.innerHTML = `
        <div class="library-song-cover" style="background-image: url('${song.cover || defaultCover}');"></div>
        <div class="library-song-info">
          <div class="library-song-title">${song.title}</div>
          <div class="library-song-artist">${song.artist}</div>
        </div>
        <div class="library-song-duration">${duration}</div>
        <button class="menu-button">
          <svg width="16" height="16" stroke="currentColor" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
          </svg>
        </button>
        <div class="menu">
          <div class="menu-item" data-action="delete">Delete</div>
          <div class="menu-item" data-action="favorite">Add to Favorite</div>
          <div class="menu-item" data-action="relax">Add to Relax</div>
          <div class="menu-item" data-action="focus">Add to Focus</div>
          <div class="menu-item" data-action="uplift">Add to Uplift</div>
        </div>
      `;
      songElement.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-button') && !e.target.closest('.menu')) {
          const songIndex = songs.findIndex(s => s.title === song.title && s.artist === song.artist);
          if (songIndex !== -1) {
            currentSongIndex = songIndex;
            loadSong(currentSongIndex, true);
            showHome();
          }
        }
      });
      elements.librarySongs.appendChild(songElement);
    });

    // Menu button listeners
    document.querySelectorAll('.menu-button').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = button.nextElementSibling;
        document.querySelectorAll('.menu').forEach(m => {
          if (m !== menu) m.classList.remove('active');
        });
        menu.classList.toggle('active');
      });
    });

    // Menu item actions
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        const songElement = item.closest('.library-song');
        const songTitle = songElement.querySelector('.library-song-title').textContent;
        const songIndex = librarySongs.findIndex(s => s.title === songTitle);
        const originalSongIndex = songs.findIndex(s => s.title === songTitle);

        if (songIndex === -1 || originalSongIndex === -1) {
          console.warn('Song not found for action:', action);
          return;
        }

        const song = songs[originalSongIndex];

        switch (action) {
          case 'delete':
            librarySongs.splice(songIndex, 1);
            initLibrary();
            break;
          case 'favorite':
            song.isFavorite = !song.isFavorite;
            if (song.isFavorite) {
              if (!playlists.likedSongs.includes(song)) {
                playlists.likedSongs.push(song);
              }
            } else {
              playlists.likedSongs = playlists.likedSongs.filter(s => s !== song);
            }
            elements.favoriteButton.classList.toggle('favorited', song.isFavorite);
            break;
          case 'relax':
            if (!playlists.relax.includes(song)) {
              playlists.relax.push(song);
            }
            break;
          case 'focus':
            if (!playlists.focus.includes(song)) {
              playlists.focus.push(song);
            }
            break;
          case 'uplift':
            if (!playlists.uplift.includes(song)) {
              playlists.uplift.push(song);
            }
            break;
        }
        item.closest('.menu').classList.remove('active');
        initLibrary();
      });
    });
  }

  function showHome() {
    elements.library.classList.remove('active');
    elements.nowPlaying.style.display = 'flex';
    elements.playlist.style.display = 'block';
    elements.libraryNav.classList.remove('active');
    elements.homeNav.classList.add('active');
    elements.relaxNav.classList.remove('active');
    elements.focusNav.classList.remove('active');
    elements.upliftNav.classList.remove('active');
    elements.likedSongsNav.classList.remove('active');
    elements.chillVibesNav.classList.remove('active');
  }

  function showLibrary() {
    elements.library.classList.add('active');
    elements.nowPlaying.style.display = 'none';
    elements.playlist.style.display = 'none';
    elements.libraryNav.classList.add('active');
    elements.homeNav.classList.remove('active');
    elements.relaxNav.classList.remove('active');
    elements.focusNav.classList.remove('active');
    elements.upliftNav.classList.remove('active');
    elements.likedSongsNav.classList.remove('active');
    elements.chillVibesNav.classList.remove('active');
  }

  function showPlaylist(playlistName) {
    elements.library.classList.add('active');
    elements.nowPlaying.style.display = 'none';
    elements.playlist.style.display = 'none';
    elements.libraryNav.classList.remove('active');
    elements.homeNav.classList.remove('active');
    elements.relaxNav.classList.toggle('active', playlistName === 'relax');
    elements.focusNav.classList.toggle('active', playlistName === 'focus');
    elements.upliftNav.classList.toggle('active', playlistName === 'uplift');
    elements.likedSongsNav.classList.toggle('active', playlistName === 'likedSongs');
    elements.chillVibesNav.classList.toggle('active', playlistName === 'chillVibes');

    librarySongs = playlists[playlistName] || [];
    initLibrary();
  }

  // Volume control
  function updateVolume(e, isMuteToggle = false) {
    let volume;
    if (isMuteToggle) {
      volume = audioPlayer.volume === 0 ? 0.5 : 0;
    } else {
      const rect = elements.volumeSlider.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const width = rect.width;
      volume = Math.max(0, Math.min(1, offsetX / width));
    }
    audioPlayer.volume = volume;
    elements.volumeProgress.style.width = `${volume * 100}%`;
    elements.volumeIcon.style.display = volume === 0 ? 'none' : 'block';
    elements.muteIcon.style.display = volume === 0 ? 'block' : 'none';
  }

  elements.volumeSlider.addEventListener('click', (e) => updateVolume(e));

  elements.volumeSlider.addEventListener('mousedown', (e) => {
    updateVolume(e);
    const moveHandler = (moveEvent) => {
      updateVolume(moveEvent);
    };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', moveHandler);
    }, { once: true });
  });

  elements.volumeIcon.addEventListener('click', () => updateVolume(null, true));
  elements.muteIcon.addEventListener('click', () => updateVolume(null, true));

  elements.libraryNav.addEventListener('click', () => {
    librarySongs = [...songs];
    showLibrary();
    initLibrary();
  });

  elements.homeNav.addEventListener('click', showHome);

  elements.relaxNav.addEventListener('click', () => showPlaylist('relax'));
  elements.focusNav.addEventListener('click', () => showPlaylist('focus'));
  elements.upliftNav.addEventListener('click', () => showPlaylist('uplift'));
  elements.likedSongsNav.addEventListener('click', () => showPlaylist('likedSongs'));
  elements.chillVibesNav.addEventListener('click', () => showPlaylist('chillVibes'));

  elements.playButton.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastClickTime < 300) {
      if (now - lastDebounceLog > 2000) {
        console.log('Play button click debounced');
        lastDebounceLog = now;
      }
      return;
    }
    lastClickTime = now;

    elements.playButton.disabled = true;
    setTimeout(() => {
      elements.playButton.disabled = false;
    }, 300);

    if (!audioContext) {
      initVisualizer();
    }
    if (isPlaying) {
      pauseSong();
    } else {
      playSong();
    }
  });

  elements.prevButton.addEventListener('click', prevSong);
  elements.nextButton.addEventListener('click', nextSong);

  if (elements.shuffleButton) {
    elements.shuffleButton.addEventListener('click', () => {
      isShuffling = !isShuffling;
      elements.shuffleButton.textContent = isShuffling ? 'Shuffle On' : 'Shuffle Off';
      updateNextSong();
    });
  }

  if (elements.repeatButton) {
    elements.repeatButton.addEventListener('click', () => {
      isRepeating = !isRepeating;
      elements.repeatButton.textContent = isRepeating ? 'Repeat On' : 'Repeat Off';
    });
  }

  if (elements.favoriteButton) {
    elements.favoriteButton.addEventListener('click', () => {
      songs[currentSongIndex].isFavorite = !songs[currentSongIndex].isFavorite;
      elements.favoriteButton.classList.toggle('favorited');
      if (songs[currentSongIndex].isFavorite) {
        if (!playlists.likedSongs.includes(songs[currentSongIndex])) {
          playlists.likedSongs.push(songs[currentSongIndex]);
        }
      } else {
        playlists.likedSongs = playlists.likedSongs.filter(s => s !== songs[currentSongIndex]);
      }
    });
  }

  if (elements.progressBar) {
    elements.progressBar.addEventListener('click', (e) => {
      if (!isMetadataLoaded || !audioPlayer.duration) {
        console.warn('Cannot seek: Audio duration not available');
        return;
      }

      const rect = elements.progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const seekTime = (clickX / width) * audioPlayer.duration;

      audioPlayer.currentTime = seekTime;
      const progressPercentage = (seekTime / audioPlayer.duration) * 100;
      elements.progress.style.width = `${progressPercentage}%`;
      elements.currentTimeEl.textContent = formatTime(seekTime);

      if (isPlaying) {
        cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(updateProgress);
      }
    });
  }

  if (elements.hamburgerIcon && elements.sidebar) {
    elements.hamburgerIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.hamburgerIcon.classList.toggle('active');
      elements.sidebar.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && elements.sidebar.classList.contains('active')) {
        const clickedInsideSidebar = elements.sidebar.contains(e.target);
        const clickedHamburger = elements.hamburgerIcon.contains(e.target);

        if (!clickedInsideSidebar && !clickedHamburger) {
          elements.hamburgerIcon.classList.remove('active');
          elements.sidebar.classList.remove('active');
        }
      }
    });
  }

  function initPlaylist() {
    elements.playlistSongs.innerHTML = '';
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const songElement = document.createElement('div');
      songElement.className = 'playlist-song';
      if (i === currentSongIndex) {
        songElement.classList.add('current-song');
      }

      const durationText = song.duration ? formatTime(song.duration) : '--:--';
      songElement.innerHTML = `
        <div class="playlist-song-info">
          <div class="playlist-song-title">${song.title}</div>
          <div class="playlist-song-artist">${song.artist}</div>
        </div>
        <div class="song-duration">${durationText}</div>
      `;

      songElement.addEventListener('click', () => {
        currentSongIndex = i;
        loadSong(currentSongIndex, true);
      });

      elements.playlistSongs.appendChild(songElement);
    }
    updateNextSong();
  }

  function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLightTheme = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
    elements.themeToggleButton.textContent = isLightTheme ? 'Dark Mode' : 'Light Mode';
  }

  if (elements.themeToggleButton) {
    elements.themeToggleButton.addEventListener('click', toggleTheme);
  }

  function init() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      elements.themeToggleButton.textContent = 'Dark Mode';
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
      elements.themeToggleButton.textContent = 'Light Mode';
    }

    initPlaylist();
    initLibrary();
    loadSong(currentSongIndex, false);
    showHome();
  }

  init();
});
