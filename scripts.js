(function () {

    // DOM
    var contenedor = $('#contenedor'),
        juego = $('#juego'),
        principal = $('#principal'),
        instrucciones = $('#instrucciones'),
        muestraScore = document.querySelector('#puntaje output'),
        muestraDulzura = document.querySelector('#dulzura output'),
        canvas = document.querySelector('canvas'),
        terminado = $('#juego-terminado'),
        msjJuegoTerminado = terminado ? terminado.querySelector('.mensaje') : null,
        personajes = document.querySelectorAll('div.dentro-instrucciones'),
        ctx = canvas.getContext('2d');

    // Jugador
    var playerImg = document.getElementById('eze');
    var comienzaDulzura = muestraDulzura ? +muestraDulzura.innerHTML : 100;

    // Estados
    var puntajes = { energy: comienzaDulzura },
        playerIncrease = +(playerImg.getAttribute('data-increase') || 8);

    var puntaje = 0,
        estadoDelJuego = null,
        x = 0,
        sprites = [],
        listaSprites = [],
        contadorSprite = 0,
        ahora = 0,
        viejo = null,
        playerY = 0,
        offset = 0,
        width = 0,
        height = 0,
        incrementeNivel = 0,
        scoresGuardados = { last: 0, high: 0 },
        iniciaSprites = 5,
        nuevoSprite = 5000,   // más puntos antes de nuevos objetos
        izquierdaAbajo = false,
        derechaAbajo = false;

    // Balas
    var balas = [];
    var velocidadBala = 7;

    // Control de disparo
    var ultimoDisparo = 0;
    var cooldownDisparo = 300; // ms

    // Escala del jugador
    var scaleFactor = 0.4;

    // ====== INICIO ======
    function inicia() {
        var spriteData = document.querySelectorAll('img.sprite');
        var i = spriteData.length;
        while (i--) {
            var actual = {};
            actual.efectos = [];
            actual.img = spriteData[i];
            actual.offset = spriteData[i].offsetWidth / 2;
            var informacionPuntaje = spriteData[i].getAttribute('data-collision').split(',');
            var j = informacionPuntaje.length;
            while (j--) {
                var valorTecla = informacionPuntaje[j].split(':');
                actual.efectos.push({
                    efecto: valorTecla[0],
                    value: valorTecla[1]
                });
            }
            actual.type = spriteData[i].getAttribute('data-type');
            listaSprites.push(actual);
        }
        contadorSprite = spriteData.length;

        contenedor.tabIndex = -1;
        contenedor.focus();

        contenedor.addEventListener('keydown', enTeclaAbajo, false);
        contenedor.addEventListener('keyup', enTeclaArriba, false);
        contenedor.addEventListener('click', enClick, false);
        contenedor.addEventListener('mousemove', enMovimientoMouse, false);

        muestraPrincipio();
    };

    // ====== EVENTOS ======
    function enClick(ev) {
        var t = ev.target;
        if (estadoDelJuego === 'juego-terminado' && t.id === 'jugar-de-nuevo') {
            muestraPrincipio();
        }
        if (t.className === 'proximo') { instruccionesSiguiente(); }
        if (t.className === 'fin-instrucciones') { instruccionesListo(); }
        if (t.id === 'boton-instrucciones') { mostrarInstrucciones(); }
        if (t.id === 'boton-jugar') { juegoEmpieza(); }
        ev.preventDefault();
    }

    function enTeclaAbajo(ev) {
        if (ev.keyCode === 39) { derechaAbajo = true; }
        else if (ev.keyCode === 37) { izquierdaAbajo = true; }
        else if (ev.keyCode === 32) {
            ev.preventDefault();  // 👈 evita scroll/reload con barra
            disparar();
        }
    }

    function enTeclaArriba(ev) {
        if (ev.keyCode === 39) { derechaAbajo = false; }
        else if (ev.keyCode === 37) { izquierdaAbajo = false; }
        else if (ev.keyCode === 32) {
            ev.preventDefault();  // 👈 evita scroll/reload también al soltar
        }
    }

    function enMovimientoMouse(ev) {
        var mx = ev.clientX - contenedor.offsetLeft;
        if (mx < offset) { mx = offset; }
        if (mx > width - offset) { mx = width - offset; }
        x = mx;
    }

    // ====== PANTALLAS ======
    function muestraPrincipio() {
        setActual(principal);
        estadoDelJuego = 'principal';
        if (principal) {
            var scoreelms = principal.querySelectorAll('output');
            if (scoreelms[0]) scoreelms[0].innerHTML = scoresGuardados.last;
            if (scoreelms[1]) scoreelms[1].innerHTML = scoresGuardados.high;
        }
    }

    function mostrarInstrucciones() {
        setActual(instrucciones);
        estadoDelJuego = 'instrucciones';
        ahora = 0;
        if (personajes[ahora]) personajes[ahora].className = 'current';
    }

    function instruccionesListo() {
        if (personajes[ahora]) personajes[ahora].className = 'dentro-instrucciones';
        ahora = 0;
        muestraPrincipio();
    }

    function instruccionesSiguiente() {
        if (personajes[ahora + 1]) { ahora = ahora + 1; }
        if (personajes[ahora]) {
            personajes[ahora - 1].className = 'dentro-instrucciones';
            personajes[ahora].className = 'current';
        }
    }

    // ====== JUEGO ======
    function juegoEmpieza() {
        setActual(juego);
        estadoDelJuego = 'jugando';
        document.body.className = 'jugando';
        width = juego.offsetWidth;
        height = juego.offsetHeight;
        canvas.width = width;
        canvas.height = height;
        playerY = height - playerImg.height * scaleFactor;
        offset = (playerImg.width * scaleFactor) / 2;
        x = width / 2;
        sprites = [];
        balas = [];
        for (var i = 0; i < iniciaSprites; i++) {
            sprites.push(agregaSprite());
        }
        puntajes.energy = comienzaDulzura;
        incrementeNivel = 0;
        puntaje = 0;
        if (muestraDulzura) muestraDulzura.innerHTML = comienzaDulzura;
        ciclo();
    }

    function ciclo() {
        ctx.clearRect(0, 0, width, height);

        // Sprites
        for (var i = 0; i < sprites.length; i++) {
            sprites[i].render();
            sprites[i].update();
        }

        // Balas
        for (let b = 0; b < balas.length; b++) {
            let bala = balas[b];
            bala.y -= velocidadBala;
            ctx.drawImage(bala.img, bala.x, bala.y);

            for (let s = 0; s < sprites.length; s++) {
                if (sprites[s].type === "malo" && colision(bala, sprites[s])) {
                    seteaDataSprite(sprites[s]);
                    balas.splice(b, 1);
                    b--;
                    puntaje += 100;
                    break;
                }
            }
            if (bala.y < 0) { balas.splice(b, 1); b--; }
        }

        // HUD
        if (muestraDulzura) muestraDulzura.innerHTML = puntajes.energy;
        var barra = document.querySelector('#barra-energia .nivel');
        if (barra) barra.style.width = puntajes.energy + "%";
        if (muestraScore) muestraScore.innerHTML = ~~(puntaje / 10);
        puntaje++;

        if (~~(puntaje / nuevoSprite) > incrementeNivel) {
            if (sprites.length < 5) {
                sprites.push(agregaSprite());
            }
            incrementeNivel++;
        }

        if (izquierdaAbajo) { jugadorIzquierda(); }
        if (derechaAbajo) { jugadorDerecha(); }

        // Jugador con escala
        ctx.save();
        ctx.translate(x - offset, playerY);
        ctx.drawImage(playerImg, 0, 0, playerImg.width * scaleFactor, playerImg.height * scaleFactor);
        ctx.restore();

        puntajes.energy = Math.min(puntajes.energy, 100);
        if (puntajes.energy > 0) requestAnimationFrame(ciclo);
        else juegoTerminado();
    };

    function jugadorIzquierda() {
        x -= playerIncrease;
        if (x < offset) x = offset;
    }

    function jugadorDerecha() {
        x += playerIncrease;
        if (x > width - offset) x = width - offset;
    }

    function juegoTerminado() {
        document.body.className = 'juego-terminado';
        setActual(terminado);
        estadoDelJuego = 'juego-terminado';
        var nowscore = ~~(puntaje / 10);
        if (terminado) terminado.querySelector('output').innerHTML = nowscore;
        scoresGuardados.last = nowscore;
        if (nowscore > scoresGuardados.high) {
            if (msjJuegoTerminado) msjJuegoTerminado.innerHTML = msjJuegoTerminado.getAttribute('data-highscore');
            scoresGuardados.high = nowscore;
        }
    }

    // ====== SPRITES ======
    function sprite() {
        this.px = 0; this.py = 0; this.vx = 0; this.vy = 0;
        this.height = 0; this.width = 0; this.efectos = [];
        this.img = null;
        this.update = function () {
            this.px += this.vx; this.py += this.vy;
            if (~~(this.py + 10) > playerY) {
                if ((x - offset) < this.px && this.px < (x + offset)) {
                    this.py = -200;
                    var i = this.efectos.length;
                    while (i--) {
                        puntajes[this.efectos[i].efecto] += +this.efectos[i].value;
                    }
                }
            }
            if (this.px > (width - this.offset) || this.px < this.offset) {
                this.vx = -this.vx;
            }
            if (this.py > height + 100) {
                if (this.type === 'bueno') {
                    var i = this.efectos.length;
                    while (i--) {
                        puntajes[this.efectos[i].efecto] -= +this.efectos[i].value;
                    }
                }
                seteaDataSprite(this);
            }
        };
        this.render = function () {
            ctx.save();
            ctx.translate(this.px, this.py);
            ctx.translate(this.width * -0.5, this.height * -0.5);
            ctx.drawImage(this.img, 0, 0);
            ctx.restore();
        };
    };

    function agregaSprite() {
        var s = new sprite();
        seteaDataSprite(s);
        return s;
    };

    function seteaDataSprite(sprite) {
        var r = ~~rand(0, contadorSprite);
        sprite.img = listaSprites[r].img;
        sprite.height = sprite.img.offsetHeight;
        sprite.width = sprite.img.offsetWidth;
        sprite.type = listaSprites[r].type;
        sprite.efectos = listaSprites[r].efectos;
        sprite.offset = listaSprites[r].offset;
        sprite.py = -100;
        sprite.px = rand(sprite.width / 2, width - sprite.width / 2);
        sprite.vx = rand(-1, 2);
        sprite.vy = rand(0.5, 1.2);   // más lento
    };

    // ====== UTILS ======
    function $(str) { return document.querySelector(str); }
    function rand(min, max) { return ((Math.random() * (max - min)) + min); }

    function setActual(elm) {
        if (!elm) return;
        if (viejo) viejo.className = '';
        elm.className = 'current';
        viejo = elm;
    };

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = (function () {
            return window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function (callback) { window.setTimeout(callback, 1000 / 60); };
        })();
    }

    inicia();

    // ====== DISPARO ======
    function disparar() {
        var ahora = Date.now();
        if (ahora - ultimoDisparo < cooldownDisparo) return; // 👈 evita disparos seguidos
        ultimoDisparo = ahora;

        var bala = { x: x, y: playerY, width: 10, height: 20, img: new Image() };
        bala.img.src = "Assets/bala.png";
        balas.push(bala);
    }

    function colision(a, b) {
        return (
            a.x < b.px + b.width &&
            a.x + a.width > b.px &&
            a.y < b.py + b.height &&
            a.y + a.height > b.py
        );
    }

})();

// ====== AUDIO ======
var toggleIcoAudio = 0, audio = document.getElementById("audio");
function toggleAudio() {
    if (toggleIcoAudio == 0) {
        document.getElementById("audio-ico").setAttribute('src', 'Assets/audio_mute.png');
        toggleIcoAudio++; audio.pause();
    } else {
        document.getElementById("audio-ico").setAttribute('src', 'Assets/audio_on.png');
        toggleIcoAudio--; audio.play();
    }
}
