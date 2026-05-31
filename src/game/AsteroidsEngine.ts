/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
const TWO_PI = Math.PI * 2;

export interface GameState {
  status: 'START' | 'PLAYING' | 'GAMEOVER';
  score: number;
  lives: number;
  level: number;
}

export type StateChangeCallback = (state: GameState) => void;

interface Ship {
  x: number; y: number; vx: number; vy: number;
  angle: number; radius: number; cooldown: number; 
  invulnerable: number; thrusting: boolean;
}
interface Asteroid {
  x: number; y: number; vx: number; vy: number;
  radius: number; sides: number; offsets: number[];
  angle: number; spin: number;
}
interface Bullet { x: number; y: number; vx: number; vy: number; life: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; }
interface Star { x: number; y: number; size: number; alpha: number; }

export class AsteroidsEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onStateChange: StateChangeCallback;
  
  private requestRef: number = 0;
  private keys: Record<string, boolean> = {};
  
  private state: GameState;
  
  private ship: Ship = {
    x: 0, y: 0, vx: 0, vy: 0, 
    angle: -Math.PI / 2, radius: 12,
    cooldown: 0, invulnerable: 0, thrusting: false
  };
  
  private asteroids: Asteroid[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = [];

  constructor(canvas: HTMLCanvasElement, onStateChange: StateChangeCallback) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStateChange = onStateChange;
    this.state = { status: 'START', score: 0, lives: 3, level: 1 };
    
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.loop = this.loop.bind(this);

    this.initStars();
    this.notifyState();
    this.draw();
  }

  public mount() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    if (this.state.status === 'START') {
      this.spawnAsteroids(5);
    }
    this.requestRef = requestAnimationFrame(this.loop);
  }

  public unmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    cancelAnimationFrame(this.requestRef);
  }

  public startGame() {
    this.state = { status: 'PLAYING', score: 0, lives: 3, level: 1 };
    this.resetShip();
    this.asteroids = [];
    this.bullets = [];
    this.particles = [];
    this.spawnAsteroids(this.state.level * 4);
    this.notifyState();
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    this.keys[e.key] = true;
    if (this.state.status !== 'PLAYING' && e.key === ' ') {
      this.startGame();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys[e.key] = false;
  }

  private notifyState() {
    this.onStateChange({ ...this.state });
  }

  private initStars() {
    this.stars = Array.from({ length: 150 }, () => ({
      x: rand(0, this.canvas.width),
      y: rand(0, this.canvas.height),
      size: rand(0.5, 2),
      alpha: rand(0.2, 0.8)
    }));
  }

  private resetShip() {
    this.ship = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      vx: 0, vy: 0,
      angle: -Math.PI / 2,
      radius: 12, cooldown: 0,
      invulnerable: 120, // 2 seconds
      thrusting: false
    };
  }

  private spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
       let x, y;
       do {
         x = rand(0, this.canvas.width);
         y = rand(0, this.canvas.height);
       } while (this.state.status === 'PLAYING' && dist(x, y, this.ship.x, this.ship.y) < 150);
       
       this.asteroids.push(this.createAsteroid(x, y, 40));
    }
  }

  private createAsteroid(x: number, y: number, radius: number): Asteroid {
    const sides = Math.floor(rand(7, 12));
    const offsets = Array.from({ length: sides }, () => rand(0.7, 1.2));
    return {
      x, y,
      vx: rand(-1.5, 1.5) * (40 / radius),
      vy: rand(-1.5, 1.5) * (40 / radius),
      radius, sides, offsets,
      angle: rand(0, TWO_PI),
      spin: rand(-0.02, 0.02)
    };
  }

  private explosion(x: number, y: number, color: string, count: number) {
    for(let i=0; i<count; i++) {
      this.particles.push({
        x, y,
        vx: rand(-3, 3), vy: rand(-3, 3),
        life: rand(20, 50), maxLife: 50, color
      });
    }
  }

  private update() {
    const { width, height } = this.canvas;

    if (this.state.status === 'PLAYING') {
      if (this.keys['ArrowLeft'] || this.keys['a']) this.ship.angle -= 0.1;
      if (this.keys['ArrowRight'] || this.keys['d']) this.ship.angle += 0.1;

      if (this.keys['ArrowUp'] || this.keys['w']) {
        this.ship.thrusting = true;
        this.ship.vx += Math.cos(this.ship.angle) * 0.15;
        this.ship.vy += Math.sin(this.ship.angle) * 0.15;
        if (Math.random() > 0.5) {
          this.particles.push({
            x: this.ship.x - Math.cos(this.ship.angle) * this.ship.radius,
            y: this.ship.y - Math.sin(this.ship.angle) * this.ship.radius,
            vx: -Math.cos(this.ship.angle) * 2 + rand(-0.5, 0.5),
            vy: -Math.sin(this.ship.angle) * 2 + rand(-0.5, 0.5),
            life: rand(10, 20), maxLife: 20, color: '#ff8800'
          });
        }
      } else {
        this.ship.thrusting = false;
      }
      
      this.ship.vx *= 0.99;
      this.ship.vy *= 0.99;
      this.ship.x += this.ship.vx;
      this.ship.y += this.ship.vy;

      if (this.ship.x < 0) this.ship.x = width;
      else if (this.ship.x > width) this.ship.x = 0;
      if (this.ship.y < 0) this.ship.y = height;
      else if (this.ship.y > height) this.ship.y = 0;

      if (this.ship.cooldown > 0) this.ship.cooldown--;
      if (this.keys[' '] && this.ship.cooldown === 0 && this.bullets.length < 8) {
        this.bullets.push({
          x: this.ship.x + Math.cos(this.ship.angle) * this.ship.radius,
          y: this.ship.y + Math.sin(this.ship.angle) * this.ship.radius,
          vx: Math.cos(this.ship.angle) * 8 + this.ship.vx * 0.5,
          vy: Math.sin(this.ship.angle) * 8 + this.ship.vy * 0.5,
          life: 60
        });
        this.ship.cooldown = 12;
      }

      if (this.ship.invulnerable > 0) this.ship.invulnerable--;
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      
      if (b.x < 0) b.x = width; else if (b.x > width) b.x = 0;
      if (b.y < 0) b.y = height; else if (b.y > height) b.y = 0;

      if (b.life <= 0) this.bullets.splice(i, 1);
    }

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      let a = this.asteroids[i];
      a.x += a.vx;
      a.y += a.vy;
      a.angle += a.spin;

      if (a.x < -a.radius) a.x = width + a.radius; else if (a.x > width + a.radius) a.x = -a.radius;
      if (a.y < -a.radius) a.y = height + a.radius; else if (a.y > height + a.radius) a.y = -a.radius;

      let hit = false;
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        let b = this.bullets[j];
        if (dist(a.x, a.y, b.x, b.y) < a.radius) {
          hit = true;
          this.bullets.splice(j, 1);
          break;
        }
      }

      if (hit) {
        this.explosion(a.x, a.y, '#ffffff', a.radius > 20 ? 15 : 8);
        const nextRadius = a.radius / 2;
        if (nextRadius >= 10) {
          this.asteroids.push(this.createAsteroid(a.x, a.y, nextRadius));
          this.asteroids.push(this.createAsteroid(a.x, a.y, nextRadius));
          this.state.score += 20;
        } else {
          this.state.score += 50;
        }
        this.asteroids.splice(i, 1);
        this.notifyState();
        continue;
      }

      if (this.state.status === 'PLAYING' && this.ship.invulnerable === 0) {
        if (dist(a.x, a.y, this.ship.x, this.ship.y) < a.radius + this.ship.radius - 2) {
           this.explosion(this.ship.x, this.ship.y, '#00ffff', 30);
           this.state.lives--;
           if (this.state.lives <= 0) {
             this.state.status = 'GAMEOVER';
           } else {
             this.resetShip();
             this.explosion(a.x, a.y, '#ffffff', 15);
             this.asteroids.splice(i, 1);
           }
           this.notifyState();
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
       let p = this.particles[i];
       p.x += p.vx;
       p.y += p.vy;
       p.life--;
       if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.state.status === 'PLAYING' && this.asteroids.length === 0) {
       this.state.level++;
       this.state.score += 100;
       this.spawnAsteroids(this.state.level * 4);
       this.notifyState();
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    
    this.ctx.fillStyle = '#050510';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.fillStyle = '#ffffff';
    this.stars.forEach(s => {
      this.ctx.globalAlpha = s.alpha;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.size, 0, TWO_PI);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.fillStyle = '#050510';
    
    for (const a of this.asteroids) {
      this.ctx.save();
      this.ctx.translate(a.x, a.y);
      this.ctx.rotate(a.angle);
      this.ctx.beginPath();
      for(let i=0; i<a.sides; i++) {
         const angle = (i / a.sides) * TWO_PI;
         const r = a.radius * a.offsets[i];
         const px = Math.cos(angle) * r;
         const py = Math.sin(angle) * r;
         if (i === 0) this.ctx.moveTo(px, py);
         else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    }

    if (this.state.status === 'PLAYING' && (this.ship.invulnerable === 0 || Math.floor(Date.now() / 100) % 2 === 0)) {
       this.ctx.save();
       this.ctx.translate(this.ship.x, this.ship.y);
       this.ctx.rotate(this.ship.angle);
       
       this.ctx.strokeStyle = '#00ffff';
       this.ctx.lineWidth = 2;
       
       this.ctx.beginPath();
       this.ctx.moveTo(this.ship.radius, 0);
       this.ctx.lineTo(-this.ship.radius, this.ship.radius * 0.7);
       this.ctx.lineTo(-this.ship.radius * 0.5, 0);
       this.ctx.lineTo(-this.ship.radius, -this.ship.radius * 0.7);
       this.ctx.closePath();
       this.ctx.stroke();

       this.ctx.restore();
    }

    this.ctx.fillStyle = '#ff00ff';
    for (const b of this.bullets) {
       this.ctx.beginPath();
       this.ctx.arc(b.x, b.y, 2.5, 0, TWO_PI);
       this.ctx.fill();
    }

    for (const p of this.particles) {
       this.ctx.globalAlpha = p.life / p.maxLife;
       this.ctx.fillStyle = p.color;
       this.ctx.beginPath();
       this.ctx.arc(p.x, p.y, 1.5, 0, TWO_PI);
       this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }

  private loop() {
    this.update();
    this.draw();
    this.requestRef = requestAnimationFrame(this.loop);
  }
}
