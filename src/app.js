import Tone from 'tone';
import teoria from 'teoria';

import {randRange, map} from './helper';
import {Mine, NoteTile} from './elements';

const LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40, LEFT_L = 65, UP_L = 87, RIGHT_L = 68, DOWN_L = 83, SPACE = 32;

const MUTED = window.location.hash === '#muted' || false;
const BEATS = 8;
const MINE_COUNT = 2;
const MINE_LIMIT = 9;
const PITCHES = 3;
const PLAYER_COUNT = 1;
const STARTING_TEMPO = 240;

// debug
var SHOW_MINES = false;

class Player {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.render = function(ctx) {
      ctx.fillStyle = (id == 0 ? "#FF0000" : "#00FF00");
      ctx.fillRect(20,20,20,20);
    }
  }
  move(direction) {
    let maxY = gm.board.pitches;
    let maxX = gm.board.beats;
    let index =  gm.board.grid[this.x][this.y].contents.players.indexOf(this);
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
  placeMine() {
    let mine = new Mine(this.id, this.x, this.y);
    // TODO: check for other mines / blocked paths / etc
    gm.mines.push(mine);
    gm.board.grid[this.x][this.y].contents.mines.push(mine);
  }
}

class GameBoard {
  constructor(beats, pitches) {
    this.grid = [];
    this.beats = beats;
    this.pitches = pitches;
  }
  initialize() {
    for (let i=0; i<this.beats; i++) {
      this.grid[i] = [];
      for (let j=0; j<this.pitches; j++) {
        this.grid[i][j] = new NoteTile(i, j);
      }
    }
    document.getElementById("canvas").width = window.innerWidth;
    document.getElementById("canvas").height = window.innerHeight;
  }
  render() {
    let ctx = document.getElementById("canvas").getContext("2d");
    let tileSizePx = (window.innerWidth * .6) / this.beats;
    let spacing = 10;
    for (let i=0; i<this.grid.length; i++) {
      for (let j=0; j<this.grid[i].length; j++) {
        // render tiles
        ctx.fillStyle="#555";
        if (i === gm.globalBeat) {
          ctx.fillStyle="#777";
        }
        let x = i*(tileSizePx + spacing);
        let y = j*(tileSizePx + spacing);
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

class GameManager {
  constructor() {
    this.board = new GameBoard(BEATS, PITCHES);
    this.soundManager = new SoundManager(this.board);

    this.players = [];
    this.mines = [];
    this.globalBeat = 0; // initializing to 0 to avoid annoying errors. this might cause errors.
    this.sweepCount = 0; // sweeps per level, TODO: may want to add universal count
    this.levelCount = 0;
  }

  start() {
    this.board.initialize();
    for (let i=0; i<PLAYER_COUNT; i++) {
      let x = 0; // start on the left side every time
      let y = randRange(0, PITCHES);
      this.players[i] = new Player(i, x, y);
      this.board.grid[x][y].contents.players.push(this.players[i]);
    }
    for(let i=0; i<MINE_COUNT; i++) {
      this.placeRandomMine();
    }
    this.board.render();
    this.soundManager.start();
    requestAnimationFrame(this.step.bind(this));
  }

  step(currentTime) {
    this.board.render();
    requestAnimationFrame(this.step.bind(this));
  }

  handleInput(key) {
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

  showLastMines() {
    this.mines.forEach((mine, it) => {
      console.log('mine',mine);
      mine.hidden = false;
      this.board.grid[mine.x][mine.y].hidden = false;
    })
  }

  placeRandomMine() {
    if (this.mines.length >= MINE_LIMIT) return false;
    let mine, x, y;
    while (!mine) {
      // TODO: make sure we don't get stuck in here, look to see if there are even enough empty squares
      x = randRange(1, this.board.beats); // cannot place mines on first square
      y = randRange(0, this.board.pitches);
      if (this.board.grid[x][y].contents.mines.length === 0) {
        mine = new Mine(this.players[0].id, x, y);
      }
    }
    this.mines.push(mine);
    this.board.grid[x][y].contents.mines.push(mine);
    return true;
  }
}

class SoundManager {
  constructor() {
    this.tempo = STARTING_TEMPO;
    this.lastPlayed = performance.now();
    this.currentBeat = 0;
    this.sounds = {
      hat: new Audio('assets/sounds/808-HiHats03.wav'),
      clap: new Audio('assets/sounds/808-Clap06.wav'),
      kick: new Audio('assets/sounds/808longkick.wav'),
      bell: new Audio('assets/sounds/808-Cowbell1.wav')
    }

    // set up notes via teoria.js
    const c4 = teoria.note('c4');
    this.scale = c4.scale('mixolydian').simple();
    this.chord = c4.chord('m').simple();

    // create tone.js
    const vol = new Tone.Volume(12);
    const freeverb = new Tone.Freeverb(0.7, 1200).toMaster();
    this.synth = new Tone.PolySynth(6, Tone.FMSynth, {
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
  }

  getNote(pitchIndex) {
    const octave = 3 + Math.floor(pitchIndex/this.chord.length);
    const note = this.chord[pitchIndex%this.chord.length] + octave;
    return note;
  }

  triggerSound(pitch) {
    // TODO: stop calling gm.board...
    this.getNote(gm.board.pitches - 1 - pitch);
    if (MUTED) return;
    this.synth.triggerAttackRelease(this.getNote(gm.board.pitches - 1 - pitch), '8n');
  }

  step(currentTime) {
    const delta = currentTime - this.lastPlayed;
    if(delta > (60 / this.tempo)*1000) {
      this.playBeat();
      this.lastPlayed = currentTime;
    }
    requestAnimationFrame(this.step.bind(this));
  }

  playBeat() {
    // TODO: find better way to adjust globalBeat
    gm.globalBeat = this.currentBeat;
    const instruments = gm.board.grid[this.currentBeat];
    if (!MUTED) {
      if(this.currentBeat == 0) {
        this.sounds.kick.play();
      }
      if(this.currentBeat % 2 == 0) {
        this.sounds.hat.play();
      }
    }
    instruments.forEach((tile, pitch) => {
      if (tile.contents.mines.length > 0) {
        this.triggerSound(pitch, '8n');
      }
    });

    this.currentBeat++;
    if(this.currentBeat >= gm.board.beats) {
      this.currentBeat = 0;
      gm.sweepCount++;
    }
  }

  start() {
    requestAnimationFrame(this.step.bind(this));
  }
}

const gm = new GameManager();
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
