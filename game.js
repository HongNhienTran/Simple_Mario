/**
 * RETRO NOKIA MARIO GAME - HTML5 CANVAS
 * Chuẩn tỷ lệ màn hình 240x320 pixel phong cách điện thoại Nokia cổ điển
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Kích thước chuẩn màn hình Nokia cổ điển
const SCREEN_WIDTH = 240;
const SCREEN_HEIGHT = 320;
canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;

// Vô hiệu hóa làm mờ ảnh để pixel art luôn sắc nét
ctx.imageSmoothingEnabled = false;

// Trạng thái game
const STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    VICTORY: 'VICTORY',
    GAMEOVER: 'GAMEOVER'
};

let gameState = STATE.MENU;
let frameCount = 0;
let cameraX = 0;

// Hệ thống phím điều khiển
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    action: false
};

// ==================== LỚP NHÂN VẬT MARIO ====================
class Player {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 40;
        this.y = 220;
        this.w = 14;
        this.h = 20;
        this.vx = 0;
        this.vy = 0;
        this.maxSpeed = 1.6;  // Tốc độ chạy đủ đà để bay qua ống cống
        this.accel = 0.16;
        this.friction = 0.82;
        this.jumpPower = -5.4; // Tăng lực nhảy để dễ dàng vượt qua ống cống cao
        this.gravity = 0.24;   // Trọng lực nhẹ hơn để có thời gian bay lướt
        this.grounded = false;
        this.jumpKeyHeld = false; // Ngăn nhảy liên tục khi đè giữ phím
        this.facing = 1; // 1: phải, -1: trái
        this.lives = 3;
        this.coins = 0;
        this.score = 0;
        this.animTimer = 0;
        this.animFrame = 0;
        this.invulnerable = 0; // Thời gian bất tử sau khi dính đòn
        this.isWaving = false; // Dáng vẫy tay ăn mừng
    }

    update(platforms, questionBlocks) {
        if (this.invulnerable > 0) this.invulnerable--;

        // Xử lý di chuyển ngang có gia tốc đầm tay
        if (keys.left) {
            this.vx = Math.max(this.vx - this.accel, -this.maxSpeed);
            this.facing = -1;
        } else if (keys.right) {
            this.vx = Math.min(this.vx + this.accel, this.maxSpeed);
            this.facing = 1;
        } else {
            this.vx *= this.friction;
            if (Math.abs(this.vx) < 0.08) this.vx = 0;
        }

        // Xử lý nhảy: chỉ kích hoạt 1 lần khi nhấn phím, buông ra nhấn lại mới nhảy tiếp
        const jumpPressed = keys.up || keys.action;
        if (jumpPressed && !this.jumpKeyHeld && this.grounded) {
            this.vy = this.jumpPower;
            this.grounded = false;
            this.jumpKeyHeld = true;
            window.soundEngine.playJump();
        }
        if (!jumpPressed) {
            this.jumpKeyHeld = false;
            // Nếu nhả phím nhảy sớm khi đang bay lên, giảm vận tốc để nhảy thấp
            if (this.vy < -2) {
                this.vy *= 0.8;
            }
        }

        // Áp dụng trọng lực
        this.vy += this.gravity;
        if (this.vy > 5.5) this.vy = 5.5;

        // Cập nhật vị trí X & va chạm ngang
        this.x += this.vx;
        if (this.x < 0) this.x = 0;

        // Va chạm với khối gạch từ 2 bên
        [...platforms, ...questionBlocks].forEach(p => {
            if (checkAABB(this, p)) {
                if (this.vx > 0) this.x = p.x - this.w;
                else if (this.vx < 0) this.x = p.x + p.w;
            }
        });

        // Cập nhật vị trí Y & va chạm đứng
        this.y += this.vy;
        this.grounded = false;

        [...platforms, ...questionBlocks].forEach(p => {
            if (checkAABB(this, p)) {
                // Rơi từ trên xuống mặt đất / khối gạch / đỉnh ống cống
                if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 8) {
                    this.y = p.y - this.h;
                    this.vy = 0;
                    this.grounded = true;
                }
                // Húc đầu vào đáy khối gạch từ dưới lên
                else if (this.vy < 0 && this.y - this.vy >= p.y + p.h - 8) {
                    this.y = p.y + p.h;
                    this.vy = 0;
                    if (p.onHit) p.onHit(this);
                }
            }
        });

        // Rơi xuống vực (hố sâu)
        if (this.y > SCREEN_HEIGHT + 20) {
            this.takeDamage(true);
        }

        // Hoạt ảnh bước đi
        if (Math.abs(this.vx) > 0.2 && this.grounded) {
            this.animTimer++;
            if (this.animTimer > 5) {
                this.animFrame = (this.animFrame + 1) % 3;
                this.animTimer = 0;
            }
        } else {
            this.animFrame = 0;
        }
    }

    takeDamage(instantKill = false) {
        if (this.invulnerable > 0 && !instantKill) return;
        window.soundEngine.playHit();
        this.lives--;
        this.invulnerable = 60; // 1 giây bất tử
        this.vy = -4.5;

        if (this.lives <= 0 || instantKill) {
            window.soundEngine.playGameOver();
            gameState = STATE.GAMEOVER;
        }
    }

    draw(ctx) {
        // Nhấp nháy khi đang bất tử
        if (this.invulnerable > 0 && Math.floor(frameCount / 4) % 2 === 0) {
            return;
        }

        ctx.save();
        ctx.translate(Math.round(this.x - cameraX), Math.round(this.y));

        if (this.facing === -1) {
            ctx.scale(-1, 1);
            ctx.translate(-this.w, 0);
        }

        // Vẽ Mario theo phong cách Pixel Art sắc nét
        const red = '#E52521';
        const blue = '#0055D4';
        const skin = '#FFCCA3';
        const brown = '#6F3800';
        const yellow = '#FFD700';

        // 1. Mũ đỏ
        ctx.fillStyle = red;
        ctx.fillRect(3, 0, 9, 3);
        ctx.fillRect(1, 3, 12, 2);

        // 2. Khuôn mặt & Râu
        ctx.fillStyle = skin;
        ctx.fillRect(3, 5, 8, 5);
        // Mắt đen
        ctx.fillStyle = '#000';
        ctx.fillRect(8, 6, 2, 2);
        // Mũi da
        ctx.fillStyle = skin;
        ctx.fillRect(10, 6, 3, 2);
        // Râu nâu
        ctx.fillStyle = brown;
        ctx.fillRect(7, 8, 5, 2);
        // Tóc mai / mang tai
        ctx.fillRect(1, 5, 2, 3);

        // 3. Thân áo đỏ & Quần yếm xanh
        ctx.fillStyle = red;
        ctx.fillRect(2, 10, 10, 4);

        // Quần yếm xanh
        ctx.fillStyle = blue;
        ctx.fillRect(3, 12, 8, 5);
        // Dây đeo yếm
        ctx.fillRect(4, 10, 2, 3);
        ctx.fillRect(8, 10, 2, 3);
        // Khuy vàng
        ctx.fillStyle = yellow;
        ctx.fillRect(4, 12, 1, 1);
        ctx.fillRect(9, 12, 1, 1);

        // 4. Tay Mario (Vẫy tay khi chiến thắng hoặc đưa tay khi chạy)
        ctx.fillStyle = red;
        if (this.isWaving) {
            // Giơ tay vẫy hình chữ V như trên poster
            ctx.fillRect(10, 3, 3, 6);
            ctx.fillStyle = '#FFF'; // Găng tay trắng
            ctx.fillRect(11, 0, 3, 3);
        } else if (!this.grounded) {
            // Giơ tay nhảy
            ctx.fillRect(10, 8, 3, 3);
            ctx.fillStyle = '#FFF';
            ctx.fillRect(11, 6, 3, 3);
        } else {
            // Tay thường
            const armOff = this.animFrame === 1 ? -1 : 1;
            ctx.fillRect(1, 10 + armOff, 3, 3);
            ctx.fillStyle = '#FFF';
            ctx.fillRect(1, 13 + armOff, 3, 2);
        }

        // 5. Chân & Giày nâu
        ctx.fillStyle = blue;
        if (this.grounded) {
            if (this.animFrame === 1) {
                ctx.fillRect(2, 16, 4, 2);
                ctx.fillRect(8, 15, 4, 2);
                ctx.fillStyle = brown;
                ctx.fillRect(1, 18, 5, 2);
                ctx.fillRect(7, 17, 5, 2);
            } else if (this.animFrame === 2) {
                ctx.fillRect(2, 15, 4, 2);
                ctx.fillRect(8, 16, 4, 2);
                ctx.fillStyle = brown;
                ctx.fillRect(1, 17, 5, 2);
                ctx.fillRect(8, 18, 5, 2);
            } else {
                ctx.fillRect(2, 16, 4, 2);
                ctx.fillRect(8, 16, 4, 2);
                ctx.fillStyle = brown;
                ctx.fillRect(1, 18, 5, 2);
                ctx.fillRect(8, 18, 5, 2);
            }
        } else {
            // Nhảy co chân
            ctx.fillRect(1, 15, 4, 2);
            ctx.fillRect(8, 14, 4, 2);
            ctx.fillStyle = brown;
            ctx.fillRect(0, 17, 5, 2);
            ctx.fillRect(8, 16, 5, 2);
        }

        ctx.restore();
    }
}

// ==================== CÔNG CHÚA PEACH ====================
class Princess {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 18;
        this.h = 26;
        this.heartTimer = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x - cameraX), Math.round(this.y));

        const pink = '#FF69B4';
        const lightPink = '#FFB6C1';
        const gold = '#FFD700';
        const skin = '#FFCCA3';
        const blue = '#00BFFF';

        // Vương miện vàng & đá quý xanh
        ctx.fillStyle = gold;
        ctx.fillRect(6, 0, 7, 3);
        ctx.fillRect(6, 0, 2, 1);
        ctx.fillRect(11, 0, 2, 1);
        ctx.fillStyle = blue;
        ctx.fillRect(9, 1, 1, 1);

        // Tóc vàng óng ả
        ctx.fillStyle = gold;
        ctx.fillRect(4, 3, 11, 7);
        ctx.fillRect(2, 7, 3, 7);
        ctx.fillRect(14, 7, 3, 7);

        // Mặt
        ctx.fillStyle = skin;
        ctx.fillRect(5, 5, 9, 6);
        // Mắt to tròn xanh biếc
        ctx.fillStyle = blue;
        ctx.fillRect(6, 7, 2, 2);
        ctx.fillRect(11, 7, 2, 2);
        // Má hồng
        ctx.fillStyle = '#FF9999';
        ctx.fillRect(5, 9, 2, 1);
        ctx.fillRect(12, 9, 2, 1);

        // Váy công chúa hồng bồng bềnh
        ctx.fillStyle = pink;
        ctx.fillRect(6, 12, 7, 4); // Thân áo
        ctx.fillRect(3, 16, 13, 10); // Tà váy xòe
        ctx.fillStyle = lightPink;
        ctx.fillRect(5, 17, 9, 8); // Họa tiết váy trước
        // Đá ngọc xanh ở ngực
        ctx.fillStyle = blue;
        ctx.fillRect(9, 13, 2, 2);

        // Tay vẫy chào vui mừng
        ctx.fillStyle = skin;
        const wave = Math.sin(frameCount * 0.15) * 2;
        ctx.fillRect(2, 13 + wave, 2, 4);
        ctx.fillRect(15, 13 - wave, 2, 4);

        ctx.restore();
    }
}

// ==================== QUÁI VẬT NẤM (GOOMBA) ====================
class Enemy {
    constructor(x, y, range = 60) {
        this.startX = x;
        this.x = x;
        this.y = y;
        this.w = 16;
        this.h = 16;
        this.vx = -0.4; // Tốc độ tuần tra chậm rãi, dễ né
        this.range = range;
        this.alive = true;
        this.squishTimer = 0;
    }

    update(player) {
        if (!this.alive) {
            this.squishTimer--;
            return;
        }

        this.x += this.vx;
        if (this.x < this.startX - this.range || this.x > this.startX + this.range) {
            this.vx = -this.vx;
        }

        // Kiểm tra va chạm với Mario
        if (checkAABB(player, this)) {
            // Nếu Mario dẫm lên đầu quái từ trên xuống
            if (player.vy > 0 && player.y + player.h - player.vy <= this.y + 6) {
                this.alive = false;
                this.squishTimer = 25;
                player.vy = -4.2; // Mario nảy lên cao
                player.score += 100;
                window.soundEngine.playStomp();
                createParticles(this.x + 8, this.y + 8, '#8B4513', 6);
            } else {
                // Mario va chạm từ bên hông -> bị mất máu
                player.takeDamage();
            }
        }
    }

    draw(ctx) {
        if (!this.alive && this.squishTimer <= 0) return;

        ctx.save();
        ctx.translate(Math.round(this.x - cameraX), Math.round(this.y));

        if (!this.alive) {
            // Dáng bị dẹp lép
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(1, 10, 14, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(3, 12, 10, 2);
            ctx.restore();
            return;
        }

        // Đầu nấm nâu
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(3, 0, 10, 4);
        ctx.fillRect(1, 4, 14, 5);

        // Mặt và mắt
        ctx.fillStyle = '#FFE4B5';
        ctx.fillRect(3, 9, 10, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(4, 7, 2, 3);
        ctx.fillRect(10, 7, 2, 3);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(4, 7, 1, 1);
        ctx.fillRect(10, 7, 1, 1);

        // Chân bước luân phiên
        ctx.fillStyle = '#000';
        const leg = Math.floor(frameCount / 8) % 2;
        if (leg === 0) {
            ctx.fillRect(2, 13, 5, 3);
            ctx.fillRect(9, 13, 5, 2);
        } else {
            ctx.fillRect(2, 13, 5, 2);
            ctx.fillRect(9, 13, 5, 3);
        }

        ctx.restore();
    }
}

// ==================== KHỐI GẠCH HỎI CHẤM & ĐỒNG XU ====================
class QuestionBlock {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 16;
        this.h = 16;
        this.hit = false;
        this.bounceY = 0;
    }

    onHit(player) {
        if (this.hit) return;
        this.hit = true;
        this.bounceY = -5;
        player.coins++;
        player.score += 200;
        window.soundEngine.playCoin();
        createCoinEffect(this.x + 4, this.y - 14);
        createParticles(this.x + 8, this.y, '#FFD700', 8);
    }

    update() {
        if (this.bounceY < 0) this.bounceY += 0.5;
        else this.bounceY = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x - cameraX), Math.round(this.y + this.bounceY));

        if (!this.hit) {
            // Khối màu vàng có viền đen
            ctx.fillStyle = '#E69100';
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#FFC000';
            ctx.fillRect(1, 1, 14, 14);
            ctx.fillStyle = '#734800';
            ctx.fillRect(0, 0, 16, 1);
            ctx.fillRect(0, 0, 1, 16);
            ctx.fillRect(0, 15, 16, 1);
            ctx.fillRect(15, 0, 1, 16);

            // 4 đinh ốc 4 góc
            ctx.fillStyle = '#734800';
            ctx.fillRect(2, 2, 1, 1);
            ctx.fillRect(13, 2, 1, 1);
            ctx.fillRect(2, 13, 1, 1);
            ctx.fillRect(13, 13, 1, 1);

            // Dấu hỏi ? nhấp nháy
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(6, 3, 4, 2);
            ctx.fillRect(9, 5, 2, 2);
            ctx.fillRect(7, 7, 2, 2);
            ctx.fillRect(7, 10, 2, 2);
        } else {
            // Khối gạch rỗng xám sau khi bị đập
            ctx.fillStyle = '#8B8B8B';
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#666';
            ctx.fillRect(1, 1, 14, 14);
            ctx.fillStyle = '#444';
            ctx.fillRect(2, 2, 1, 1);
            ctx.fillRect(13, 2, 1, 1);
            ctx.fillRect(2, 13, 1, 1);
            ctx.fillRect(13, 13, 1, 1);
        }

        ctx.restore();
    }
}

// Đồng xu bay lơ lửng trên map
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 12;
        this.h = 12;
        this.collected = false;
    }

    update(player) {
        if (this.collected) return;
        if (checkAABB(player, this)) {
            this.collected = true;
            player.coins++;
            player.score += 50;
            window.soundEngine.playCoin();
            createParticles(this.x + 6, this.y + 6, '#FFD700', 6);
        }
    }

    draw(ctx) {
        if (this.collected) return;
        ctx.save();
        ctx.translate(Math.round(this.x - cameraX), Math.round(this.y));

        // Hoạt ảnh đồng xu xoay
        const anim = Math.floor(frameCount / 6) % 4;
        const widths = [10, 6, 2, 6];
        const w = widths[anim];
        const offset = Math.floor((12 - w) / 2);

        ctx.fillStyle = '#FFD700';
        ctx.fillRect(offset, 1, w, 10);
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(offset + 1, 2, Math.max(1, w - 2), 8);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(offset + 1, 3, 1, 2);

        ctx.restore();
    }
}

// ==================== CÁC HIỆU ỨNG HẠT & PHÁO HOA ====================
const particles = [];
function createParticles(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 3.5,
            vy: (Math.random() - 0.8) * 4,
            color,
            life: 20 + Math.random() * 15,
            size: 2 + Math.random() * 2
        });
    }
}

const coinEffects = [];
function createCoinEffect(x, y) {
    coinEffects.push({
        x, y,
        vy: -3.5,
        life: 20
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = coinEffects.length - 1; i >= 0; i--) {
        const c = coinEffects[i];
        c.y += c.vy;
        c.vy += 0.25;
        c.life--;
        if (c.life <= 0) coinEffects.splice(i, 1);
    }
}

function drawParticles(ctx) {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - cameraX), Math.round(p.y), p.size, p.size);
    });

    coinEffects.forEach(c => {
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(Math.round(c.x - cameraX), Math.round(c.y), 8, 10);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(Math.round(c.x - cameraX) + 2, Math.round(c.y) + 2, 2, 4);
    });
}

// ==================== VA CHẠM AABB ====================
function checkAABB(r1, r2) {
    return r1.x < r2.x + r2.w &&
           r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h &&
           r1.y + r1.h > r2.y;
}

// ==================== XÂY DỰNG BẢN ĐỒ LEVEL ====================
let player = new Player();
let princess = null;
let platforms = [];
let questionBlocks = [];
let coins = [];
let enemies = [];
let flagPole = null;
let castle = null;
const LEVEL_WIDTH = 2200;

function initLevel() {
    player.reset();
    cameraX = 0;
    platforms = [];
    questionBlocks = [];
    coins = [];
    enemies = [];

    // 1. Mặt đất có các hố chông/vực thử thách
    const groundHeight = 240;

    // Đoạn đất 1: x = 0 đến 450
    platforms.push({ x: 0, y: groundHeight, w: 480, h: 80, type: 'ground' });

    // Đoạn đất 2: x = 540 đến 980 (vực sâu 60px)
    platforms.push({ x: 540, y: groundHeight, w: 460, h: 80, type: 'ground' });

    // Đoạn đất 3: x = 1040 đến 1500
    platforms.push({ x: 1050, y: groundHeight, w: 460, h: 80, type: 'ground' });

    // Đoạn đất 4: Khu vực lâu đài x = 1560 đến hết level
    platforms.push({ x: 1570, y: groundHeight, w: 700, h: 80, type: 'ground' });

    // 2. Ống cống xanh cổ điển (Chiều cao cân đối vừa vặn để nhảy qua thoải mái)
    platforms.push({ x: 200, y: groundHeight - 24, w: 26, h: 24, type: 'pipe' });
    platforms.push({ x: 380, y: groundHeight - 32, w: 26, h: 32, type: 'pipe' });
    platforms.push({ x: 740, y: groundHeight - 28, w: 26, h: 28, type: 'pipe' });
    platforms.push({ x: 1300, y: groundHeight - 34, w: 26, h: 34, type: 'pipe' });

    // 3. Khối gạch lơ lửng & Khối hỏi chấm ?
    // Cụm 1
    questionBlocks.push(new QuestionBlock(120, groundHeight - 60));
    platforms.push({ x: 136, y: groundHeight - 60, w: 16, h: 16, type: 'brick' });
    questionBlocks.push(new QuestionBlock(152, groundHeight - 60));
    platforms.push({ x: 168, y: groundHeight - 60, w: 16, h: 16, type: 'brick' });

    // Cụm 2 bắc cầu qua vực 1 (rất dễ nhảy)
    platforms.push({ x: 485, y: groundHeight - 24, w: 28, h: 12, type: 'brick' });
    platforms.push({ x: 515, y: groundHeight - 36, w: 28, h: 12, type: 'brick' });

    // Cụm 3 bậc thang kim tự tháp gạch
    for (let i = 0; i < 4; i++) {
        platforms.push({ x: 860 + i * 16, y: groundHeight - (i + 1) * 16, w: 16, h: (i + 1) * 16, type: 'stair' });
    }

    // Bậc đỡ qua vực 2 (giữa đoạn 2 và đoạn 3)
    platforms.push({ x: 1010, y: groundHeight - 26, w: 32, h: 12, type: 'brick' });

    // Cụm 4 trên cao
    questionBlocks.push(new QuestionBlock(1150, groundHeight - 65));
    questionBlocks.push(new QuestionBlock(1182, groundHeight - 65));
    platforms.push({ x: 1166, y: groundHeight - 65, w: 16, h: 16, type: 'brick' });

    // Bậc đỡ qua vực 3 (trước lâu đài)
    platforms.push({ x: 1520, y: groundHeight - 26, w: 36, h: 12, type: 'brick' });

    // 4. Đồng xu lơ lửng
    coins.push(new Coin(122, groundHeight - 85));
    coins.push(new Coin(154, groundHeight - 85));
    coins.push(new Coin(208, groundHeight - 48));
    coins.push(new Coin(620, groundHeight - 20));
    coins.push(new Coin(650, groundHeight - 20));
    coins.push(new Coin(680, groundHeight - 20));
    coins.push(new Coin(1168, groundHeight - 90));
    coins.push(new Coin(1420, groundHeight - 20));

    // 5. Quái nấm Goomba đi tuần
    enemies.push(new Enemy(280, groundHeight - 16, 40));
    enemies.push(new Enemy(640, groundHeight - 16, 50));
    enemies.push(new Enemy(1120, groundHeight - 16, 45));
    enemies.push(new Enemy(1400, groundHeight - 16, 50));

    // 6. Cột cờ chiến thắng (Flagpole)
    flagPole = { x: 1780, y: groundHeight - 110, w: 6, h: 110 };

    // 7. Lâu đài nguy nga & Công chúa Peach
    castle = { x: 1840, y: groundHeight - 90, w: 120, h: 90 };
    princess = new Princess(1900, groundHeight - 26);
}

// ==================== HÀM VẼ CẢNH NỀN & HUD ====================
function drawBackground() {
    // 1. Bầu trời xanh lơ retro gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    skyGrad.addColorStop(0, '#5C94FC');
    skyGrad.addColorStop(0.7, '#A5C6FF');
    skyGrad.addColorStop(1, '#D8E8FF');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 2. Mây pixel bồng bềnh trôi chậm
    ctx.fillStyle = '#FFFFFF';
    const cloudOffset = (frameCount * 0.2) % 300;
    drawPixelCloud(30 - cloudOffset * 0.5, 35, 34);
    drawPixelCloud(160 - cloudOffset * 0.5, 60, 42);
    drawPixelCloud(320 - cloudOffset * 0.5, 40, 30);

    // 3. Đồi núi xa (Parallax scrolling)
    const hillX = -((cameraX * 0.3) % 200);
    ctx.fillStyle = '#22B14C';
    for (let i = -1; i < 3; i++) {
        drawHill(hillX + i * 180, 240, 70, 45);
    }
}

function drawPixelCloud(x, y, w) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(rx + 10, ry + 8, 8, 0, Math.PI * 2);
    ctx.arc(rx + 20, ry + 5, 11, 0, Math.PI * 2);
    ctx.arc(rx + 30, ry + 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(rx + 5, ry + 8, 30, 8);
}

function drawHill(x, groundY, w, h) {
    ctx.fillStyle = '#00A800';
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.quadraticCurveTo(x + w / 2, groundY - h * 2, x + w, groundY);
    ctx.fill();
    ctx.strokeStyle = '#006400';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Vẽ gạch, ống cống, lâu đài
function drawWorld() {
    // 1. Vẽ các khối đất / nền
    platforms.forEach(p => {
        const drawX = Math.round(p.x - cameraX);
        if (drawX + p.w < -20 || drawX > SCREEN_WIDTH + 20) return;

        if (p.type === 'ground') {
            // Nền cỏ xanh trên mặt đất nâu
            ctx.fillStyle = '#00A800';
            ctx.fillRect(drawX, p.y, p.w, 4);
            ctx.fillStyle = '#D2691E';
            ctx.fillRect(drawX, p.y + 4, p.w, p.h - 4);

            // Gân gạch đất retro
            ctx.fillStyle = '#8B4513';
            for (let bx = 0; bx < p.w; bx += 16) {
                for (let by = 8; by < p.h; by += 16) {
                    ctx.fillRect(drawX + bx, p.y + by, 14, 12);
                }
            }
        } else if (p.type === 'pipe') {
            // Ống cống xanh Mario
            ctx.fillStyle = '#00A800';
            ctx.fillRect(drawX, p.y, p.w, p.h);
            // Viền và bóng sáng ống cống
            ctx.fillStyle = '#80E000';
            ctx.fillRect(drawX + 3, p.y, 4, p.h);
            ctx.fillStyle = '#005800';
            ctx.fillRect(drawX + p.w - 5, p.y, 4, p.h);
            // Nắp vành ống cống
            ctx.fillStyle = '#00A800';
            ctx.fillRect(drawX - 2, p.y, p.w + 4, 8);
            ctx.fillStyle = '#80E000';
            ctx.fillRect(drawX + 1, p.y, 4, 8);
            ctx.fillStyle = '#005800';
            ctx.fillRect(drawX + p.w - 3, p.y, 4, 8);
        } else if (p.type === 'brick' || p.type === 'stair') {
            // Gạch nung đỏ nâu
            ctx.fillStyle = '#B84418';
            ctx.fillRect(drawX, p.y, p.w, p.h);
            ctx.fillStyle = '#000';
            ctx.strokeRect(drawX, p.y, p.w, p.h);
            ctx.fillStyle = '#D87040';
            ctx.fillRect(drawX + 1, p.y + 1, p.w - 2, 2);
        }
    });

    // 2. Vẽ các khối hỏi chấm
    questionBlocks.forEach(qb => qb.draw(ctx));

    // 3. Vẽ cờ đích
    if (flagPole) {
        const fx = Math.round(flagPole.x - cameraX);
        ctx.fillStyle = '#8B8B8B';
        ctx.fillRect(fx, flagPole.y, flagPole.w, flagPole.h);
        // Quả cầu vàng đỉnh cột
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(fx - 2, flagPole.y - 6, 10, 6);
        // Lá cờ xanh/đỏ bay phấp phới
        ctx.fillStyle = '#00D800';
        ctx.fillRect(fx + 6, flagPole.y + 12, 18, 12);
    }

    // 4. Lâu đài nguy nga
    if (castle) {
        const cx = Math.round(castle.x - cameraX);
        // Tường thành đá
        ctx.fillStyle = '#A0A0A0';
        ctx.fillRect(cx, castle.y, castle.w, castle.h);

        // 3 Tháp canh
        ctx.fillStyle = '#808080';
        ctx.fillRect(cx - 8, castle.y - 20, 24, castle.h + 20); // Tháp trái
        ctx.fillRect(cx + castle.w - 16, castle.y - 20, 24, castle.h + 20); // Tháp phải
        ctx.fillRect(cx + 40, castle.y - 35, 40, castle.h + 35); // Tháp giữa

        // Chóp tháp hình răng cưa
        ctx.fillStyle = '#606060';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(cx - 8 + i * 8, castle.y - 24, 6, 4);
            ctx.fillRect(cx + castle.w - 16 + i * 8, castle.y - 24, 6, 4);
        }

        // Cửa vòm lâu đài
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx + castle.w / 2, castle.y + castle.h - 18, 14, Math.PI, 0);
        ctx.fillRect(cx + castle.w / 2 - 14, castle.y + castle.h - 18, 28, 18);
        ctx.fill();

        // Thảm đỏ đón chào
        ctx.fillStyle = '#E52521';
        ctx.fillRect(cx + castle.w / 2 - 10, castle.y + castle.h, 20, 8);
    }
}

// Vẽ thanh trạng thái HUD chuẩn Nokia (Tim máu, Điểm, Xu)
function drawHUD() {
    ctx.save();
    // Khung nền đen mờ ở đỉnh
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, 22);

    // Tim máu (Lives)
    for (let i = 0; i < 3; i++) {
        drawHeart(8 + i * 14, 5, i < player.lives);
    }

    // Đồng xu & Số lượng xu
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(65, 6, 7, 9);
    ctx.fillStyle = '#FFF';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(`x${player.coins.toString().padStart(2, '0')}`, 76, 14);

    // Điểm số
    ctx.textAlign = 'right';
    ctx.fillText(`${player.score.toString().padStart(5, '0')}`, SCREEN_WIDTH - 8, 14);

    ctx.restore();
}

function drawHeart(x, y, full = true) {
    ctx.fillStyle = full ? '#FF2244' : '#555555';
    ctx.fillRect(x + 1, y, 3, 2);
    ctx.fillRect(x + 5, y, 3, 2);
    ctx.fillRect(x, y + 2, 9, 3);
    ctx.fillRect(x + 1, y + 5, 7, 2);
    ctx.fillRect(x + 2, y + 7, 5, 2);
    ctx.fillRect(x + 3, y + 9, 3, 1);
    ctx.fillRect(x + 4, y + 10, 1, 1);
}

// ==================== MÀN HÌNH MENU / VICTORY / GAMEOVER ====================
function drawMenuScreen() {
    drawBackground();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.save();
    ctx.textAlign = 'center';

    // Tiêu đề Game phong cách Nokia
    ctx.fillStyle = '#FFD700';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText('NOKIA MARIO', SCREEN_WIDTH / 2, 85);

    ctx.fillStyle = '#FFF';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('RESCUE PEACH', SCREEN_WIDTH / 2, 110);

    // Nhân vật Demo đứng ở giữa
    player.x = SCREEN_WIDTH / 2 - 7;
    player.y = 135;
    player.isWaving = true;
    player.draw(ctx);

    // Hướng dẫn
    ctx.fillStyle = '#FFFF77';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText('NHẤN [5] HOẶC [START]', SCREEN_WIDTH / 2, 195);
    ctx.fillText('ĐỂ BẮT ĐẦU CHƠI', SCREEN_WIDTH / 2, 210);

    // Phím bấm
    ctx.fillStyle = '#DDD';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillText('DI CHUYỂN: PHÍM 4 / 6', SCREEN_WIDTH / 2, 245);
    ctx.fillText('NHẢY: PHÍM 2 / 5 / SPACE', SCREEN_WIDTH / 2, 260);

    ctx.restore();
}

function drawGameOverScreen() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#E52521';
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillText('GAME OVER', SCREEN_WIDTH / 2, 120);

    ctx.fillStyle = '#FFF';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText(`ĐIỂM: ${player.score}`, SCREEN_WIDTH / 2, 155);
    ctx.fillText(`XU: ${player.coins}`, SCREEN_WIDTH / 2, 175);

    ctx.fillStyle = '#FFD700';
    ctx.fillText('NHẤN [5] ĐỂ THỬ LẠI', SCREEN_WIDTH / 2, 220);
    ctx.restore();
}

function drawVictoryScreen() {
    ctx.save();
    // Bắn pháo hoa pixel
    if (frameCount % 12 === 0) {
        const colors = ['#FF0055', '#FFD700', '#00FFCC', '#FF7700', '#FFFFFF'];
        const randCol = colors[Math.floor(Math.random() * colors.length)];
        createParticles(
            Math.random() * SCREEN_WIDTH + cameraX,
            40 + Math.random() * 80,
            randCol,
            12
        );
    }

    // Bảng vinh danh công chúa đã được cứu
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(15, 45, SCREEN_WIDTH - 30, 110);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 45, SCREEN_WIDTH - 30, 110);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FF69B4';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText('CỨU CÔNG CHÚA!', SCREEN_WIDTH / 2, 75);

    ctx.fillStyle = '#FFF';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText('THANK YOU MARIO!', SCREEN_WIDTH / 2, 98);

    ctx.fillStyle = '#FFD700';
    ctx.fillText(`TỔNG ĐIỂM: ${player.score}`, SCREEN_WIDTH / 2, 120);

    ctx.fillStyle = '#00FFCC';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillText('NHẤN [5] ĐỂ CHƠI LẠI', SCREEN_WIDTH / 2, 140);

    ctx.restore();
}

// ==================== VÒNG LẶP CHÍNH (GAME LOOP) ====================
function update() {
    frameCount++;
    updateParticles();

    if (gameState === STATE.PLAYING) {
        // Cập nhật Mario
        player.isWaving = false;
        player.update(platforms, questionBlocks);

        // Cập nhật khối gạch & quái vật
        questionBlocks.forEach(qb => qb.update());
        coins.forEach(c => c.update(player));
        enemies.forEach(e => e.update(player));

        // Camera bám theo Mario mượt mà (đặt Mario cách mép trái 90px để nhìn xa phía trước)
        const targetCameraX = player.x - 90;
        if (targetCameraX > cameraX) {
            cameraX += (targetCameraX - cameraX) * 0.08;
        }
        if (cameraX < 0) cameraX = 0;
        if (cameraX > LEVEL_WIDTH - SCREEN_WIDTH) cameraX = LEVEL_WIDTH - SCREEN_WIDTH;

        // Kiểm tra chạm công chúa / cờ để chiến thắng!
        if (princess && player.x >= princess.x - 12) {
            gameState = STATE.VICTORY;
            player.vx = 0;
            player.isWaving = true;
            player.score += 1000;
            window.soundEngine.playVictory();
        }
    } else if (gameState === STATE.VICTORY) {
        player.isWaving = true;
    }
}

function render() {
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    if (gameState === STATE.MENU) {
        drawMenuScreen();
        return;
    }

    // Vẽ thế giới game khi đang chơi, thắng hoặc thua
    drawBackground();
    drawWorld();
    enemies.forEach(e => e.draw(ctx));
    coins.forEach(c => c.draw(ctx));
    if (princess) princess.draw(ctx);
    player.draw(ctx);
    drawParticles(ctx);
    drawHUD();

    if (gameState === STATE.GAMEOVER) {
        drawGameOverScreen();
    } else if (gameState === STATE.VICTORY) {
        drawVictoryScreen();
    }
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// ==================== XỬ LÝ SỰ KIỆN BÀN PHÍM ====================
function handleKeyDown(e) {
    window.soundEngine.init();

    // Bàn phím máy tính hoặc phím số T9
    switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
        case 'Numpad4':
        case 'Digit4':
            keys.left = true;
            break;

        case 'ArrowRight':
        case 'KeyD':
        case 'Numpad6':
        case 'Digit6':
            keys.right = true;
            break;

        case 'ArrowUp':
        case 'KeyW':
        case 'Numpad2':
        case 'Digit2':
            keys.up = true;
            break;

        case 'ArrowDown':
        case 'KeyS':
        case 'Numpad8':
        case 'Digit8':
            keys.down = true;
            break;

        case 'Space':
        case 'KeyZ':
        case 'KeyX':
        case 'Numpad5':
        case 'Digit5':
        case 'Enter':
            keys.action = true;
            handleActionPress();
            break;
    }
}

function handleKeyUp(e) {
    switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
        case 'Numpad4':
        case 'Digit4':
            keys.left = false;
            break;

        case 'ArrowRight':
        case 'KeyD':
        case 'Numpad6':
        case 'Digit6':
            keys.right = false;
            break;

        case 'ArrowUp':
        case 'KeyW':
        case 'Numpad2':
        case 'Digit2':
            keys.up = false;
            break;

        case 'ArrowDown':
        case 'KeyS':
        case 'Numpad8':
        case 'Digit8':
            keys.down = false;
            break;

        case 'Space':
        case 'KeyZ':
        case 'KeyX':
        case 'Numpad5':
        case 'Digit5':
        case 'Enter':
            keys.action = false;
            break;
    }
}

function handleActionPress() {
    if (gameState === STATE.MENU) {
        initLevel();
        gameState = STATE.PLAYING;
        window.soundEngine.startBGM();
    } else if (gameState === STATE.GAMEOVER || gameState === STATE.VICTORY) {
        initLevel();
        gameState = STATE.PLAYING;
        window.soundEngine.startBGM();
    }
}

// Khởi chạy
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

initLevel();
requestAnimationFrame(gameLoop);

// Xuất các hàm để nút bấm ảo trên vỏ máy Nokia gọi
window.gameApp = {
    setKey: (keyName, isPressed) => {
        window.soundEngine.init();
        if (keys[keyName] !== undefined) {
            keys[keyName] = isPressed;
        }
        if (isPressed && keyName === 'action') {
            handleActionPress();
        }
    },
    softLeft: () => {
        window.soundEngine.init();
        if (gameState === STATE.MENU || gameState === STATE.GAMEOVER || gameState === STATE.VICTORY) {
            handleActionPress();
        }
    },
    softRight: () => {
        const soundOn = window.soundEngine.toggleSound();
        const soundLabel = document.getElementById('soundStatus');
        if (soundLabel) {
            soundLabel.textContent = soundOn ? 'Âm thanh: Bật' : 'Âm thanh: Tắt';
        }
    }
};
