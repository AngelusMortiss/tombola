// Import some stuff from matter.js
const { Engine, World, Bodies, Body, Vector, SAT, Events } = Matter;

// Our world and engine
let world, engine;
const debug = true;

// An array of all bodies
const bodies = [];
const balls = [];
const ballToSound = {};

let center;
let cnvs, ctx;

// A class for all bodies displayed in p5.js
class _Body {
  constructor(body, color) {
    this.body = body;
    this.color = color;

    // Add the body to the world
    World.add(world, this.body);
  }

  draw() {
    // Draw the body by its vertices
    fill(this.color ?? 100);
    let pos = this.body.position;
    let angle = this.body.angle;
    // shadow blur is a bit too much of a perf hit
    // ctx.shadowColor = this.color ?? 100;
    // ctx.shadowBlur = 50;
    beginShape();
    for (var i = 0; i < this.body.vertices.length; i++) {
      vertex(this.body.vertices[i].x, this.body.vertices[i].y);
    }
    endShape();
  }

  destroy() {
    World.remove(engine.world, this.body)
  }
}

function throttle(cb, delay = 250) {
  let shouldWait = false

  return (...args) => {
    if (shouldWait) return

    cb(...args)
    shouldWait = true
    setTimeout(() => {
      shouldWait = false
    }, delay)
  }
}

const radius = 200

function sideLength(numSides, radius) {
  const radians = (180 / numSides) * (Math.PI / 180)
  const sideWidth = 2 * radius * Math.sin(radians)

  return sideWidth
}

function createShape(numSides) {
  const wallThickness = 5
  const sides = [];
  const colors = ['red', 'green', 'blue', 'yellow', 'orange', 'gray', 'purple']

  sideWidth = sideLength(numSides, radius)

  // calculate offset from the circumradius
  doubleLength = sideLength(numSides * 2, radius)
  const halfSideWidth = sideWidth / 2
  offset = Math.sqrt((doubleLength * doubleLength) - (halfSideWidth * halfSideWidth))
  // make the sides of the shape
  for (var i = 0; i < numSides; i += 1) {
    const body = Bodies.rectangle(width / 2, (height / 2) - radius + wallThickness + offset, sideWidth, wallThickness, { isStatic: true });
    body.friction = 0

    Body.rotate(body, i * (Math.PI / (numSides / 2)), center);

    sides.push(new _Body(body, colors[i % colors.length]));
  }

  return sides;
}

function _playNote(note) {
  synths[synthIdx % synths.length].triggerAttackRelease(note, "16n");
}

const playNote = throttle(_playNote, 100)

function playSound(bodyId) {
  if (bodyId in ballToSound) {
    playNote(ballToSound[bodyId])
  }
}

function setup() {
  createCanvas(800, 800);
  cnvs = document.getElementById('defaultCanvas0');
  ctx = canvas.getContext('2d');
  console.log(ctx)
  document.querySelector('canvas')?.addEventListener('click', async () => {
  	Tone.start()
  	console.log('audio is ready')
  })

  center = { x: width / 2, y: height / 2 }
  angleMode(RADIANS);
  rectMode(CENTER);
  noStroke();

  // Configuring and creating our matter world and engine
  engine = Engine.create({
    gravity: {
      y: 0.05
    }
  });
  world = engine.world;
  Matter.Runner.run(engine);

  Events.on(engine, 'collisionStart', function(event) {
    playSound(event.pairs[0].bodyA.id)
    playSound(event.pairs[0].bodyB.id)

    // let's choose body b b/c we're lazy and it's gonna get throttled anyways
    const theBody = event.pairs[0].bodyB
    Body.setAngularVelocity(theBody, 0.3)
  });

  const ss = createShape(6);
  ss.forEach(s => bodies.push(s))
}

// Create synths
const pingPong = new Tone.PingPongDelay("8n", 0.2).toDestination();
const echoSynth = new Tone.PolySynth(Tone.Synth, {
}).connect(pingPong);

const pluckySynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: 'fmtriangle',
  },
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0,
  }
}).toDestination();

const chaosSynth = new Tone.DuoSynth({
  volume: -12
}).toDestination();

let synthIdx = 0;
const synths = [echoSynth, pluckySynth, chaosSynth]


let spinSpeed = 0.045

function draw() {
  if (addBallNextRender) {
    addBallNextRender = false;
    addBall(mouseX, mouseY);
  }

  const rotateSpeed = 0.02
  if (keyIsDown(LEFT_ARROW)) {
    bodies.forEach(s => Body.rotate(s.body, rotateSpeed))
  }
  if (keyIsDown(RIGHT_ARROW)) {
    bodies.forEach(s => Body.rotate(s.body, -rotateSpeed))
  }
  if (keyIsDown(UP_ARROW)) {
    spinSpeed += 0.0005
  }
  if (keyIsDown(DOWN_ARROW)) {
    spinSpeed -= 0.0005
  }

  background(0);

  bodies.forEach(s => Body.rotate(s.body, spinSpeed, center))

  bodies.forEach(body => body.draw()); // Draw every body
  balls.forEach(ball => ball.draw());

  if (debug) {
    noFill()
    stroke('white')
    ellipse(center.x, center.y, 10, 10)
    ellipse(center.x, center.y, radius * 2, radius * 2)
    noStroke()
  }
}

function addBall(x, y, note) {
  const sounds = ['C', 'E', 'G', 'B']
  const octaves = ['3', '4', '5']
  const ball = Bodies.circle(x, y, 8)
  if (note) {
    ballToSound[ball.id] = note
  } else {
    ballToSound[ball.id] = random(sounds) + random(octaves)
  }
  ball.restitution = 1
  ball.friction = 0
  ball.frictionAir = 0
  ball.frictionStatic = 0
  // Matter.Body.setDensity(ball, 0.1)
  Matter.Body.setMass(ball, 1)
  balls.push(new _Body(ball, 'white'));
  // prevent default
  return false;
}

let octave = 3
let addBallNextRender = false;
function mouseClicked() { addBallNextRender = true }
function touchEnded() { addBallNextRender = true }

function keyPressed() {
  const keyToNote = {
    'a': 'C',
    'w': 'C#',
    's': 'D',
    'e': 'D#',
    'd': 'E',
    'f': 'F',
    't': 'F#',
    'g': 'G',
    'y': 'G#',
    'h': 'A',
    'u': 'A#',
    'j': 'B',
    'k': 'C',
    'o': 'C#',
    'l': 'D',
  }

  const octaveUp = ['k', 'o', 'l']

  const note = keyToNote[key]
  if (note != null) {
    addBall(center.x, center.y, `${note}${octaveUp.includes(key) ? octave + 1 : octave}`)
    return;
  }

  switch (keyCode) {
    case DOWN_ARROW:
      return false;
    case UP_ARROW:
      return false;
  }

  switch (key) {
    case ' ':
      balls.forEach(ball => ball.destroy())
      balls.splice(0, balls.length)
      break;
    case 'z':
      octave = Math.max(1, octave - 1);
      break;
    case 'x':
      octave = Math.min(6, octave + 1)
      break;
    case 'c':
      synthIdx += 1
      break;
  }

  // const pressedNum = parseInt(key)
  // if (typeof pressedNum === 'number' && !Number.isNaN(pressedNum)) {
  //   // update number of sides
  //   bodies.forEach(b => b.destroy())
  //   bodies.splice(0, bodies.length)
  //   const asdf = createShape(pressedNum)
  //   asdf.forEach(s => bodies.push(s))
  // }
}