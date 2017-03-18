// helper functions
function randRange(min, max) {
  return Math.floor(Math.random()*(max-min)) + min;
}

function map(n, start1, stop1, start2, stop2) {
  return ((n-start1)/(stop1-start1))*(stop2-start2)+start2;
};

var LEFT = 37,
  UP = 38,
  RIGHT = 39,
  DOWN = 40,
  LEFT_L = 65,
  UP_L = 87,
  RIGHT_L = 68,
  DOWN_L = 83,
  SPACE = 32;

// sometimes there are too many drum noises...
var MUTED = window.location.hash === '#muted' || false;
var BEATS = 8;
var MINE_COUNT = 2;
var MINE_LIMIT = 9;
var PITCHES = 3;
var PLAYER_COUNT = 1;
var STARTING_TEMPO = 240;
var SHOW_MINES = false;

var Mine = function(playerId, x, y) {
  this.id = playerId;
  this.x = x;
  this.y = y;
  this.hidden = true;
}

var NoteTile = function(x, y) {
  this.x = x;
  this.y = y;
  this.contents = {
    players: [],
    mines: []
  }
}

var Player = function(id, x, y) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.render = function(ctx) {
    ctx.fillStyle = (id == 0 ? "#FF0000" : "#00FF00");
    ctx.fillRect(20,20,20,20);
  }
  this.move = function(direction) {
    var maxY = gm.board.pitches;
    var maxX = gm.board.beats;
    var index =  gm.board.grid[this.x][this.y].contents.players.indexOf(this);
    gm.board.grid[this.x][this.y].contents.players.splice(index, 1);
    switch (direction) {
      case UP:
        this.y = (this.y > 0 ? this.y - 1 : this.y);
        break;
      case DOWN:
        this.y = (this.y < maxY-1 ? this.y + 1 : this.y);
        break;
      case LEFT:
        this.x = (this.x > 0 ? this.x - 1 : maxX-1);
        break;
      case RIGHT:
        this.x = (this.x < maxX-1 ? this.x + 1 : 0);
        if (this.x == 0) {
          gm.sweepCount = 0;
          gm.levelCount++;
          gm.showLastMines();
          gm.placeRandomMine();
        }
        break;
      case SPACE:
        gm.soundManager.triggerSound(this.y);
        break;
      default:
        console.log('received bad case in player.move');
    }
    gm.board.grid[this.x][this.y].contents.players.push(this);
  }
  this.placeMine = function() {
    var mine = new Mine(this.id, this.x, this.y);
    // TODO: check for other mines / blocked paths / etc
    gm.mines.push(mine);
    gm.board.grid[this.x][this.y].contents.mines.push(mine);
  }
}

var GameBoard = function(beats, pitches) {
  this.grid = [];
  this.beats = beats;
  this.pitches = pitches;
  this.initialize = function() {
    for (var i=0; i<this.beats; i++) {
      this.grid[i] = [];
      for (var j=0; j<this.pitches; j++) {
        this.grid[i][j] = new NoteTile(i, j);
      }
    }
    document.getElementById("canvas").width = window.innerWidth;
    document.getElementById("canvas").height = window.innerHeight;
  }
  this.render = function() {
    var ctx = document.getElementById("canvas").getContext("2d");
    var tileSizePx = (window.innerWidth * .6) / this.beats;
    var spacing = 10;
    for (var i=0; i<this.grid.length; i++) {
      for (var j=0; j<this.grid[i].length; j++) {
        // render tiles
        ctx.fillStyle="#555";
        if (i === gm.globalBeat) {
          ctx.fillStyle="#777";
        }
        var x = i*(tileSizePx + spacing);
        var y = j*(tileSizePx + spacing);
        ctx.save();
        ctx.translate(x,y);
        ctx.fillRect(0, 0, tileSizePx, tileSizePx);
        // render players
        if(this.grid[i][j].contents.players.length > 0) {
          this.grid[i][j].contents.players.forEach(function(p){
            p.render(ctx);
          });
        }

        if(this.grid[i][j].contents.mines.length > 0) {
          // only show mine when player is in square, TODO: create better collision
          if (SHOW_MINES || !this.grid[i][j].contents.mines[0].hidden || this.grid[i][j].contents.players.length > 0) {
            ctx.fillStyle='#FF0000';
            ctx.fillRect(10, 10, 10, 10);
          }
        }
        ctx.restore();
      }
    }
    // update debug menu
    document.getElementById('mineCount').innerHTML = 'Mines: ' + gm.mines.length;
    document.getElementById('levelCount').innerHTML = 'levelCount: ' + gm.levelCount;
    document.getElementById('sweepCount').innerHTML = 'sweepCount: ' + gm.sweepCount;
  }
}

var GameManager = function() {
  this.board = new GameBoard(BEATS, PITCHES);
  this.soundManager = new SoundManager(this.board);

  this.players = [];
  this.mines = [];
  this.globalBeat = 0; // initializing to 0 to avoid annoying errors. this might cause errors.
  this.sweepCount = 0; // sweeps per level, TODO: may want to add universal count
  this.levelCount = 0;

  this.start = function() {
    this.board.initialize();
    for (var i=0; i<PLAYER_COUNT; i++) {
      var x = 0; // start on the left side every time
      var y = randRange(0, PITCHES);
      this.players[i] = new Player(i, x, y);
      this.board.grid[x][y].contents.players.push(this.players[i]);
    }
    for(var i=0; i<MINE_COUNT; i++) {
      this.placeRandomMine();
    }
    this.board.render();
    this.soundManager.start();
    requestAnimationFrame(this.step.bind(this));
  }
  this.step = function(currentTime) {
    this.board.render();
    requestAnimationFrame(this.step.bind(this));
  }

  this.handleInput = function(key) {
    if (key === LEFT) {
      // this.players[0].move(LEFT);
    } else if (key === UP) {
      this.players[0].move(UP);
    } else if (key === RIGHT) {
      this.players[0].move(RIGHT);
    } else if (key === DOWN) {
      this.players[0].move(DOWN);
    } else if (key === SPACE) {
      // TODO: create separate function for making sounds
      this.players[0].move(SPACE);
    }
  }

  this.showLastMines = function() {
    var that = this;
    this.mines.forEach(function(mine, it) {
      console.log('mine',mine);
      mine.hidden = false;
      that.board.grid[mine.x][mine.y].hidden = false;
    })
    console.log('this.mines',this.mines);
  }

  this.placeRandomMine = function() {
    if (this.mines.length >= MINE_LIMIT) return false;
    var mine;
    while (!mine) {
      // TODO: make sure we don't get stuck in here, look to see if there are even enough empty squares
      var x = randRange(1, this.board.beats); // cannot place mines on first square
      var y = randRange(0, this.board.pitches);
      if (this.board.grid[x][y].contents.mines.length === 0) {
        mine = new Mine(this.players[0].id, x, y);
      }
    }
    this.mines.push(mine);
    this.board.grid[x][y].contents.mines.push(mine);
    return true;
  }
}

var SoundManager = function(board) {
  // set up notes via teoria.js
  var c4 = teoria.note('c4');
  var scale = c4.scale('mixolydian').simple();
  this.chord = c4.chord('m').simple();
  var chord = c4.chord('m').simple();

  this.getNote = function(pitchIndex) {
    // in scale
    // var octave = 3 + Math.floor(pitchIndex/scale.length);
    // var note = scale[pitchIndex % scale.length] + octave;
    // in chord
    var octave = 3 + Math.floor(pitchIndex/chord.length);
    var note = chord[pitchIndex%chord.length] + octave;
    return note;
  }

  this.triggerSound = function(pitch) {
    this.getNote(board.pitches - 1 - pitch);
    if (MUTED) return;
    synth.triggerAttackRelease(this.getNote(board.pitches - 1 - pitch), '8n');
  }

  // create tone.js
  var vol = new Tone.Volume(12);
  var freeverb = new Tone.Freeverb(0.7, 1200).toMaster();
  var synth = new Tone.PolySynth(6, Tone.FMSynth, {
      'oscillator': {
          'partials': [0, 2, 3, 4, 8],
      },
      'envelope': {
          'attack': 0.025,
          'decay': 0.4
      },
      'volume': {
      }
  }).chain(vol).connect(freeverb).toMaster();

  this.tempo = STARTING_TEMPO;
  this.lastPlayed = performance.now();
  this.currentBeat = 0;
  this.sounds = {
    hat: new Audio('assets/sounds/808-HiHats03.wav'),
    clap: new Audio('assets/sounds/808-Clap06.wav'),
    kick: new Audio('assets/sounds/808longkick.wav'),
    bell: new Audio('assets/sounds/808-Cowbell1.wav')
  }

  var that = this;
  this.step = function(currentTime) {
    var delta = currentTime - that.lastPlayed;
    if(delta > (60 / that.tempo)*1000) {
      that.playBeat();
      that.lastPlayed = currentTime;
    }
    requestAnimationFrame(that.step);
  }
  this.playBeat = function() {
    // TODO: find better way to adjust globalBeat
    gm.globalBeat = this.currentBeat;
    var instruments = board.grid[this.currentBeat];
    if (!MUTED) {
      if(this.currentBeat == 0) {
        this.sounds.kick.play();
      }
      if(this.currentBeat % 2 == 0) {
        this.sounds.hat.play();
      }
    }
    instruments.forEach(function(tile, pitch) {
      if(tile.contents.players.length > 0) {
        // TODO: find differnt players
        // this.triggerSound(pitch, '8n');
      } else if (tile.contents.mines.length > 0) {
        this.triggerSound(pitch, '8n');
      }
    }.bind(this))
    this.currentBeat++;
    if(this.currentBeat >= board.beats) {
      this.currentBeat = 0;
      gm.sweepCount++;
    }
  }
  this.start = function() {
    requestAnimationFrame(this.step);
  }
}

var gm = new GameManager();
gm.start();

document.addEventListener('keydown', function(event) {
  gm.handleInput(event.which);
});

document.addEventListener('mousedown', function() {
  SHOW_MINES = true;
});

document.addEventListener('mouseup', function() {
  SHOW_MINES = false;
});