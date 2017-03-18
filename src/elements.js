export class Mine {
  constructor(playerId, x, y) {
    this.x = x;
    this.y = y;
    this.id = playerId;
    this.hidden = true;
  }
}

export class NoteTile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.contents = {
      players: [],
      mines: []
    }
  }
}
