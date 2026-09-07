/**
 * Arrival choreography selected in the Claude visual exploration (2026-09-05).
 * Extracted from hero-coreografias.html / window.__HERO.llegada.
 * Original text sampling, braking trails, palette and neighbour links preserved.
 * Lifecycle, scheduling, quality and responsive layout belong to ClosingSignature.
 */
export function initArrival(w: number, h: number, calidad: number) {
    const TAU = 6.283185307179586;
    const RD = Math.random;
    const W = w > 2 ? w : 2;
    const H = h > 2 ? h : 2;
    let q = calidad > 0 ? calidad : 1;
    if (q > 1)
        q = 1;
    if (q < 0.25)
        q = 0.25;
    const S = W < H ? W : H;
    const DG = Math.sqrt(W * W + H * H);
    let scl = S / 880;
    if (scl < 0.72)
        scl = 0.72;
    if (scl > 1.4)
        scl = 1.4;
    let N = Math.round((1120 + (W * H) / 1020) * q);
    if (N < 240)
        N = 240;
    if (N > 2900)
        N = 2900;
    let i;
    let j;
    let k;
    let t;
    const mkc = function (a: number, b?: number) {
        let ww = Math.round(a);
        let hh = Math.round(b === undefined ? a : b);
        if (ww < 1)
            ww = 1;
        if (hh < 1)
            hh = 1;
        if (typeof document !== 'undefined' && document.createElement) {
            const c = document.createElement('canvas');
            c.width = ww;
            c.height = hh;
            return c;
        }
        return null;
    };
    const spr = function (sz: number, r: number, g: number, b: number, soft: boolean) {
        const c = mkc(sz, sz);
        if (!c)
            return null;
        let x = null;
        try {
            x = c.getContext('2d');
        }
        catch {
            x = null;
        }
        if (!x)
            return null;
        const p = 'rgba(' + r + ',' + g + ',' + b + ',';
        const gd = x.createRadialGradient(sz * 0.5, sz * 0.5, 0, sz * 0.5, sz * 0.5, sz * 0.5);
        if (soft) {
            gd.addColorStop(0, p + '0.44)');
            gd.addColorStop(0.26, p + '0.17)');
            gd.addColorStop(0.58, p + '0.045)');
            gd.addColorStop(1, p + '0)');
        }
        else {
            gd.addColorStop(0, p + '0.95)');
            gd.addColorStop(0.15, p + '0.5)');
            gd.addColorStop(0.4, p + '0.14)');
            gd.addColorStop(0.74, p + '0.024)');
            gd.addColorStop(1, p + '0)');
        }
        x.fillStyle = gd;
        x.fillRect(0, 0, sz, sz);
        return c;
    };
    /* ---------- muestreo del texto: "Nicoholas Dev" en un lienzo aparte ---------- */
    const SW = Math.round(W < 1200 ? W : 1200);
    const kk = SW / W;
    let SH = Math.round(H * kk);
    if (SH < 8)
        SH = 8;
    const tcv = mkc(SW, SH);
    let tcx = null;
    try {
        tcx = tcv ? tcv.getContext('2d', { willReadFrequently: true }) : null;
    }
    catch {
        tcx = null;
    }
    const FAM = ' "Inter","Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif';
    const cand = [];
    let cn = 0;
    let gs = 3;
    let fs = 40;
    let dos = false;
    if (tcx) {
        tcx.font = '800 100px' + FAM;
        const m1 = tcx.measureText('Nicoholas Dev').width || 690;
        const mA = tcx.measureText('Nicoholas').width || 520;
        dos = (W < 700) || (W < H * 1.04);
        if (!dos) {
            fs = 100 * (SW * 0.84) / m1;
            if (fs > SH * 0.26)
                fs = SH * 0.26;
            if (fs < SH * 0.085)
                dos = true;
        }
        if (dos) {
            fs = 100 * (SW * 0.86) / mA;
            if (fs > SH * 0.21)
                fs = SH * 0.21;
        }
        if (fs < 10)
            fs = 10;
        tcx.clearRect(0, 0, SW, SH);
        tcx.fillStyle = '#ffffff';
        tcx.textAlign = 'center';
        tcx.textBaseline = 'middle';
        tcx.font = '800 ' + fs.toFixed(2) + 'px' + FAM;
        const ccx = SW * 0.5;
        const ccy = SH * 0.46;
        if (dos) {
            const lh = fs * 1.05;
            tcx.fillText('Nicoholas', ccx, ccy - lh * 0.5);
            tcx.fillText('Dev', ccx, ccy + lh * 0.5);
        }
        else {
            tcx.fillText('Nicoholas Dev', ccx, ccy);
        }
        let img = null;
        try {
            img = tcx.getImageData(0, 0, SW, SH);
        }
        catch {
            img = null;
        }
        if (img) {
            const dd = img.data;
            const SW4 = SW * 4;
            let tinta = 0;
            let iy;
            let ix;
            let ro;
            for (iy = 0; iy < SH; iy++) {
                ro = iy * SW4 + 3;
                for (ix = 0; ix < SW; ix++)
                    if (dd[ro + (ix << 2)] > 128)
                        tinta++;
            }
            if (tinta > 60) {
                gs = Math.round(Math.sqrt(tinta / N));
                if (gs < 1)
                    gs = 1;
                if (gs > 16)
                    gs = 16;
                let ye;
                let xe;
                let yy;
                let xx;
                let sx;
                let sy;
                let cc;
                for (iy = 0; iy < SH; iy += gs) {
                    ye = iy + gs;
                    if (ye > SH)
                        ye = SH;
                    for (ix = 0; ix < SW; ix += gs) {
                        xe = ix + gs;
                        if (xe > SW)
                            xe = SW;
                        sx = 0;
                        sy = 0;
                        cc = 0;
                        for (yy = iy; yy < ye; yy++) {
                            ro = yy * SW4 + 3;
                            for (xx = ix; xx < xe; xx++)
                                if (dd[ro + (xx << 2)] > 128) {
                                    sx += xx;
                                    sy += yy;
                                    cc++;
                                }
                        }
                        if (cc > 0) {
                            cand.push(sx / cc);
                            cand.push(sy / cc);
                        }
                    }
                }
                cn = cand.length >> 1;
            }
        }
    }
    if (cn >= 160 && cn < N * 1.3)
        N = cn > 2900 ? 2900 : cn;
    /* barajado del muestreo: si sobran puntos se toma un subconjunto irregular */
    const pick = new Int32Array(cn > 0 ? cn : 1);
    for (i = 0; i < cn; i++)
        pick[i] = i;
    for (i = cn - 1; i > 0; i--) {
        j = (RD() * (i + 1)) | 0;
        t = pick[i];
        pick[i] = pick[j];
        pick[j] = t;
    }
    const tx = new Float32Array(N);
    const ty = new Float32Array(N);
    let bx0 = 1e9;
    let by0 = 1e9;
    let bx1 = -1e9;
    let by1 = -1e9;
    for (i = 0; i < N; i++) {
        let qx0;
        let qy0;
        if (cn > 0) {
            const pi = pick[i % cn] << 1;
            const jt = i >= cn ? 0.9 : 0.16;
            qx0 = (cand[pi] + (RD() - 0.5) * gs * jt) / kk;
            qy0 = (cand[pi + 1] + (RD() - 0.5) * gs * jt) / kk;
        }
        else {
            const fa = TAU * i / N;
            qx0 = W * 0.5 + Math.cos(fa) * W * 0.3;
            qy0 = H * 0.5 + Math.sin(fa * 2) * H * 0.11;
        }
        tx[i] = qx0;
        ty[i] = qy0;
        if (qx0 < bx0)
            bx0 = qx0;
        if (qx0 > bx1)
            bx1 = qx0;
        if (qy0 < by0)
            by0 = qy0;
        if (qy0 > by1)
            by1 = qy0;
    }
    const VX = (bx0 + bx1) * 0.5;
    const VY = (by0 + by1) * 0.5;
    const bw = (bx1 - bx0) || W * 0.5;
    const bh = (by1 - by0) || H * 0.2;
    let sep = (gs / kk) * (cn > N ? Math.sqrt(cn / N) : 1);
    if (sep < 1.2)
        sep = 1.2;
    const NH = 6;
    const NA = 5;
    const NV = 3;
    const NB = NH * NA * NV;
    let NF = Math.round(N * 0.16);
    if (NF < 70)
        NF = 70;
    if (NF > 300)
        NF = 300;
    const LC = Math.round(N * 0.75) + 8;
    const cel = sep * 2.7;
    const cols = Math.ceil(W / cel) + 3;
    const rows = Math.ceil(H / cel) + 3;
    const M = cols * rows;
    const st = {
        n: N, S: S, DG: DG, scl: scl, sep: sep, tau: TAU,
        vx: VX, vy: VY, bw: bw, bh: bh,
        NH: NH, NA: NA, NV: NV, NB: NB, NF: NF, LC: LC, MD: 3,
        cols: cols, rows: rows, cel: cel, M: M,
        sg: 0.62, amp: 0.34, base: 0.05, trail: 0.052, lmax: DG * 0.16,
        ozx: Math.max(0.015, Math.min(0.12, 0.45 * (W * 0.93 / bw - 1))), ozy: 0.3,
        tx: tx, ty: ty,
        dx: new Float32Array(N), dy: new Float32Array(N),
        ex: new Float32Array(N), ey: new Float32Array(N),
        zi: new Float32Array(N), zo: new Float32Array(N),
        stg: new Float32Array(N), sz: new Float32Array(N), br: new Float32Array(N),
        hu: new Float32Array(N), cv: new Float32Array(N),
        fw: new Float32Array(N), fp: new Float32Array(N),
        px: new Float32Array(N), py: new Float32Array(N),
        qx: new Float32Array(N), qy: new Float32Array(N),
        ha: new Float32Array(N), rad: new Float32Array(N),
        bk: new Int32Array(N), ord: new Int32Array(N),
        cnt: new Int32Array(NB), off: new Int32Array(NB),
        gc: new Int32Array(M + 1), gs2: new Int32Array(M + 1), gcur: new Int32Array(M + 1),
        gord: new Int32Array(N), gx: new Int32Array(N), gy: new Int32Array(N),
        deg: new Int32Array(N),
        seg: new Float32Array(9 * LC * 4), sc: new Int32Array(9),
        hl: new Int32Array(N), nh: 0, hf: new Int32Array(N),
        wx: new Float32Array(NF), wy: new Float32Array(NF), wr: new Float32Array(NF),
        ws: new Float32Array(NF), wp: new Float32Array(NF), wb: new Float32Array(NF),
        wseg: new Float32Array(3 * NF * 4), wc: new Int32Array(3),
        pal: new Array<string>(NH), alp: new Float32Array(NA), wid: new Float32Array(NV),
        lin: ['rgb(94,234,212)', 'rgb(128,182,246)', 'rgb(167,139,250)'],
        lvl: new Float32Array([0.17, 0.31, 0.54]),
        lwd: new Float32Array([0.7, 0.95, 1.35]),
        warmA: null as HTMLCanvasElement | null, warmB: null as HTMLCanvasElement | null, auroA: null as HTMLCanvasElement | null, auroB: null as HTMLCanvasElement | null,
        th1: 0, th2: 0, bgc: null as HTMLCanvasElement | null, bgx: null as CanvasRenderingContext2D | null, bgq: -1, bgn: 72, bgW: 2, bgH: 2
    };
    const ax = [0, 0.22, 0.45, 0.7, 1];
    const cr = [96, 167, 128, 94, 208];
    const cg = [80, 139, 196, 234, 255];
    const cb = [190, 250, 246, 212, 246];
    for (k = 0; k < NH; k++) {
        const mm = k / (NH - 1);
        let z = 0;
        while (z < 3 && mm > ax[z + 1])
            z++;
        const ff = (mm - ax[z]) / (ax[z + 1] - ax[z]);
        st.pal[k] = 'rgb(' + Math.round(cr[z] + (cr[z + 1] - cr[z]) * ff) + ',' +
            Math.round(cg[z] + (cg[z + 1] - cg[z]) * ff) + ',' +
            Math.round(cb[z] + (cb[z + 1] - cb[z]) * ff) + ')';
    }
    for (k = 0; k < NA; k++)
        st.alp[k] = (k + 0.62) / NA;
    let dw = sep * 0.98;
    if (dw < 2.15 * scl)
        dw = 2.15 * scl;
    if (dw > 5.8 * scl)
        dw = 5.8 * scl;
    st.wid[0] = 1.45 * scl;
    st.wid[1] = 2.6 * scl;
    st.wid[2] = dw;
    st.th1 = 0.5 * scl;
    st.th2 = 0.72 * scl;
    const hx = bw * 0.5 + 1;
    const hy = bh * 0.5 + 1;
    for (i = 0; i < N; i++) {
        const rx = tx[i] - VX;
        const ry = ty[i] - VY;
        const nx = bw > 0 ? (tx[i] - bx0) / bw : 0.5;
        st.stg[i] = 0.42 * nx + 0.58 * RD();
        const a0 = Math.atan2(ry, rx) + (RD() - 0.5) * 2.7;
        const rr = 0.07 + 0.93 * RD();
        st.dx[i] = Math.cos(a0) * rr;
        st.dy[i] = Math.sin(a0) * rr * 0.78;
        const ux = rx / hx;
        const uy = ry / hy;
        let ul = Math.sqrt(ux * ux + uy * uy);
        if (ul < 0.001)
            ul = 0.001;
        const ue = 0.5 + 0.8 * RD();
        st.ex[i] = (ux / ul) * ue + (RD() - 0.5) * 0.55;
        st.ey[i] = (uy / ul) * ue * 0.68 + (RD() - 0.5) * 0.5;
        st.zi[i] = (RD() - 0.5) * 0.55;
        st.zo[i] = (RD() - 0.5) * 2;
        st.sz[i] = (0.78 + 0.62 * RD() * RD()) * scl;
        st.br[i] = 0.6 + 0.5 * RD();
        st.hu[i] = (RD() - 0.5) * 0.15;
        st.cv[i] = RD() < 0.45 ? -0.4 : 0.06;
        st.fw[i] = 0.0004 + RD() * 0.0017;
        st.fp[i] = RD() * TAU;
        if (RD() < 0.12) {
            st.hl[st.nh++] = i;
            st.hf[i] = RD() < 0.5 ? 1 : 0;
        }
    }
    /* ---------- campo de estrellas en fuga ---------- */
    for (i = 0; i < NF; i++) {
        const wa = RD() * TAU;
        st.wx[i] = Math.cos(wa);
        st.wy[i] = Math.sin(wa) * 0.82;
        const ea = st.wx[i] / (bw * 0.62 + S * 0.05);
        const eb = st.wy[i] / (bh * 1.5 + S * 0.05);
        st.wr[i] = 1 / Math.sqrt(ea * ea + eb * eb);
        st.ws[i] = 0.000018 + RD() * 0.000042;
        st.wp[i] = RD();
        st.wb[i] = 0.35 + 0.65 * RD();
    }
    /* ---------- auras y destellos precocinados ---------- */
    st.warmA = spr(64, 110, 240, 220, false);
    st.warmB = spr(64, 168, 146, 250, false);
    st.auroA = spr(256, 58, 214, 190, true);
    st.auroB = spr(256, 132, 106, 244, true);
    const BD = 3;
    st.bgW = Math.max(2, Math.ceil(W / BD));
    st.bgH = Math.max(2, Math.ceil(H / BD));
    if (st.auroA) {
        const bc = mkc(st.bgW, st.bgH);
        let bxx = null;
        try {
            bxx = bc ? bc.getContext('2d', { alpha: false }) : null;
        }
        catch {
            bxx = null;
        }
        if (bxx) {
            st.bgc = bc;
            st.bgx = bxx;
        }
    }
    return st;
}
export function drawArrival(ctx: CanvasRenderingContext2D, w: number, h: number, avance: number, tiempo: number, st: ReturnType<typeof initArrival>) {
    const N = st.n;
    const S = st.S;
    const VX = st.vx;
    const VY = st.vy;
    const av = avance < 0 ? 0 : (avance > 1 ? 1 : avance);
    const T = tiempo;
    const NH = st.NH;
    const NA = st.NA;
    const NV = st.NV;
    const NB = st.NB;
    let i;
    let j;
    let k;
    let b;
    let c;
    let e;
    let o;
    let n;
    let u;
    let m;
    let E;
    let Ep;
    /* --------- coreografia --------- */
    let ar = av / 0.46;
    if (ar > 1)
        ar = 1;
    ar = ar * ar * (2 - ar);
    const SG = st.sg;
    const A2 = ar * (1 + SG);
    const rq = (av - 0.545) / 0.095;
    const reposo = Math.exp(-rq * rq);
    let lk = (av - 0.555) / 0.185;
    lk = lk < 0 ? 0 : (lk > 1 ? 1 : lk);
    lk = lk * lk * (3 - 2 * lk);
    let op = (av - 0.625) / 0.375;
    op = op < 0 ? 0 : (op > 1 ? 1 : op);
    op = op * op * (3 - 2 * op);
    const warp = 0.3 + 0.7 * (1 - ar);
    const F = 1.15 * (1 - ar) + T * 0.000015;
    const cF = Math.cos(F);
    const sF = Math.sin(F);
    const O = op * (0.03 + 0.022 * Math.sin(T * 0.00012));
    const cO = Math.cos(O);
    const sO = Math.sin(O);
    const BASE = st.base;
    const B1 = 1 - BASE;
    const AMP = st.amp;
    const TR = st.trail;
    const LMX = st.lmax;
    const LM2 = LMX * LMX;
    const gA = (1 + 0.58 * reposo) * (1 - 0.05 * op);
    const oq = op * st.sep * (0.55 + 1.15 * op);
    const oxg = op * st.ozx;
    const oyg = op * st.ozy;
    /* --------- fondo cacheado (solo depende de avance) --------- */
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const bx = st.bgx;
    if (bx && st.bgc && st.auroA && st.auroB) {
        const bq = (av * st.bgn + 0.5) | 0;
        if (st.bgq !== bq) {
            st.bgq = bq;
            const ba = bq / st.bgn;
            const bw2 = st.bgW;
            const bh2 = st.bgH;
            const sk = bw2 / w;
            const ra = (ba - 0.545) / 0.095;
            const rr2 = Math.exp(-ra * ra);
            let oa = (ba - 0.625) / 0.375;
            oa = oa < 0 ? 0 : (oa > 1 ? 1 : oa);
            let aa = ba / 0.46;
            if (aa > 1)
                aa = 1;
            bx.globalCompositeOperation = 'source-over';
            bx.globalAlpha = 1;
            bx.fillStyle = '#07090F';
            bx.fillRect(0, 0, bw2, bh2);
            bx.globalCompositeOperation = 'lighter';
            const vx2 = VX * sk;
            const vy2 = VY * sk;
            const r1 = st.DG * sk * (0.34 + 0.3 * aa);
            bx.globalAlpha = 0.13 + 0.25 * (1 - aa);
            bx.drawImage(st.auroB, vx2 - r1, vy2 - r1 * 0.72, r1 * 2, r1 * 1.44);
            const r2 = (st.bw * 0.72 + st.bh * 1.1) * sk;
            bx.globalAlpha = 0.07 + 0.34 * rr2 + 0.1 * oa;
            bx.drawImage(st.auroA, vx2 - r2, vy2 - r2 * 0.55, r2 * 2, r2 * 1.1);
            bx.globalCompositeOperation = 'source-over';
            bx.globalAlpha = 1;
        }
        ctx.drawImage(st.bgc, 0, 0, w, h);
    }
    else {
        ctx.fillStyle = '#07090F';
        ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const NF = st.NF;
    const wseg = st.wseg;
    const wc = st.wc;
    wc[0] = 0;
    wc[1] = 0;
    wc[2] = 0;
    const RMX = st.DG * 0.62;
    const WL = st.DG * 0.2 * warp;
    const wfade = 1 - 0.78 * reposo;
    for (i = 0; i < NF; i++) {
        let ph = T * st.ws[i] + st.wp[i] + av * 1.5;
        ph -= Math.floor(ph);
        const pr = ph * ph * (0.35 + 0.65 * ph);
        const d0 = pr * RMX;
        const re = st.wr[i];
        if (d0 <= re)
            continue;
        let d1 = d0 - WL * (0.12 + 0.88 * ph * ph);
        if (d1 < re)
            d1 = re;
        let ef = (d0 - re) / (re * 0.85 + 1);
        if (ef > 1)
            ef = 1;
        const wa2 = st.wb[i] * wfade * ef * (1 - pr * 0.5);
        if (wa2 <= 0.05)
            continue;
        const lb = wa2 < 0.28 ? 0 : (wa2 < 0.55 ? 1 : 2);
        n = wc[lb];
        if (n >= NF)
            continue;
        o = (lb * NF + n) * 4;
        wseg[o] = VX + st.wx[i] * d1;
        wseg[o + 1] = VY + st.wy[i] * d1;
        wseg[o + 2] = VX + st.wx[i] * d0 + 0.01;
        wseg[o + 3] = VY + st.wy[i] * d0;
        wc[lb] = n + 1;
    }
    for (b = 0; b < 3; b++) {
        n = wc[b];
        if (!n)
            continue;
        ctx.strokeStyle = b === 2 ? 'rgb(214,240,255)' : 'rgb(150,196,236)';
        ctx.globalAlpha = b === 0 ? 0.16 : (b === 1 ? 0.34 : 0.6);
        ctx.lineWidth = b === 2 ? 1.25 : 0.85;
        ctx.beginPath();
        const wb2 = b * NF * 4;
        for (k = 0; k < n; k++) {
            o = wb2 + k * 4;
            ctx.moveTo(wseg[o], wseg[o + 1]);
            ctx.lineTo(wseg[o + 2], wseg[o + 3]);
        }
        ctx.stroke();
    }
    const px = st.px;
    const py = st.py;
    const qx = st.qx;
    const qy = st.qy;
    const ha = st.ha;
    const rad = st.rad;
    const bk = st.bk;
    const cnt = st.cnt;
    const off = st.off;
    const ord = st.ord;
    const th1 = st.th1;
    const th2 = st.th2;
    cnt.fill(0);
    for (i = 0; i < N; i++) {
        u = A2 - st.stg[i] * SG;
        if (u < 0)
            u = 0;
        else if (u > 1)
            u = 1;
        m = 1 - u;
        E = u * u * u * (u * (u * 6 - 15) + 10);
        Ep = 30 * u * u * m * m;
        const sn = Math.sin(T * st.fw[i] + st.fp[i]);
        const s = BASE + B1 * E;
        const sE = s * (1 + m * m * st.zi[i]);
        const zz = op * st.zo[i];
        const fx = sE + oxg;
        const fy = sE + oyg + zz * 0.06;
        const gg = (1 - E) * (0.5 + 0.5 * m);
        const gp = -Ep * (0.5 + 0.5 * m) - 0.5 * (1 - E);
        const rdx = st.dx[i] * cF - st.dy[i] * sF;
        const rdy = st.dx[i] * sF + st.dy[i] * cF;
        const ax0 = st.tx[i] - VX;
        const ay0 = st.ty[i] - VY;
        const ax2 = ax0 * cO - ay0 * sO;
        const ay2 = ax0 * sO + ay0 * cO;
        const fl = (m * m * 8.5 + 0.45 + op * 1.6) * st.scl;
        let X = VX + ax2 * fx + rdx * AMP * gg * S + sn * fl;
        let Y = VY + ay2 * fy + rdy * AMP * gg * S + (1 - 2 * sn * sn) * fl * 0.75;
        if (op > 0) {
            X += st.ex[i] * oq;
            Y += st.ey[i] * oq;
        }
        const vx3 = ax0 * B1 * Ep + rdx * AMP * gp * S;
        const vy3 = ay0 * B1 * Ep + rdy * AMP * gp * S;
        const tf = TR * (sE < 0.45 ? sE * 2.22 : 1);
        let lx = vx3 * tf;
        let ly = vy3 * tf;
        const L2 = lx * lx + ly * ly;
        if (L2 > LM2) {
            const fc = LMX / Math.sqrt(L2);
            lx *= fc;
            ly *= fc;
        }
        px[i] = X;
        py[i] = Y;
        qx[i] = X - lx - 0.01;
        qy[i] = Y - ly;
        let fz = (u - 0.93) * 13.4;
        fz = 1 - fz * fz;
        const flash = fz > 0 ? fz * fz : 0;
        let al = st.br[i] * (0.34 + 0.66 * E) * (0.6 + 0.22 * E + (0.4 - 0.22 * E) * sn) * (1 + 1.25 * flash) * gA;
        if (al > 1)
            al = 1;
        const rr3 = st.sz[i] * (0.34 + 0.66 * (fy < 0.1 ? 0.1 : fy)) * (1 + 0.45 * flash);
        rad[i] = rr3;
        ha[i] = al * (0.1 + 0.85 * flash + 0.5 * reposo + 0.24 * op);
        if (al < 0.035 || X < -80 || X > w + 80 || Y < -80 || Y > h + 80) {
            bk[i] = -1;
            ha[i] = 0;
            continue;
        }
        let hm = 0.08 + 0.56 * E + 0.34 * flash + st.hu[i] + reposo * 0.22 + op * st.cv[i];
        if (hm < 0)
            hm = 0;
        else if (hm > 1)
            hm = 1;
        const hi = (hm * (NH - 1) + 0.5) | 0;
        let ai = (al * NA) | 0;
        if (ai >= NA)
            ai = NA - 1;
        const ws = st.sz[i] * E * E * E;
        b = (hi * NA + ai) * NV + (ws < th1 ? 0 : (ws < th2 ? 1 : 2));
        bk[i] = b;
        cnt[b]++;
    }
    let acc = 0;
    for (b = 0; b < NB; b++) {
        off[b] = acc;
        acc += cnt[b];
    }
    for (i = 0; i < N; i++) {
        b = bk[i];
        if (b >= 0)
            ord[off[b]++] = i;
    }
    /* --------- constelacion: enlaces entre vecinas --------- */
    if (lk > 0.02) {
        const cel = st.cel;
        const cols = st.cols;
        const rows = st.rows;
        const M = st.M;
        const gc = st.gc;
        const gs2 = st.gs2;
        const gcur = st.gcur;
        const gord = st.gord;
        const gx = st.gx;
        const gy = st.gy;
        gc.fill(0);
        for (i = 0; i < N; i++) {
            let cx2 = (px[i] / cel + 1) | 0;
            if (cx2 < 0)
                cx2 = 0;
            else if (cx2 >= cols)
                cx2 = cols - 1;
            let cy2 = (py[i] / cel + 1) | 0;
            if (cy2 < 0)
                cy2 = 0;
            else if (cy2 >= rows)
                cy2 = rows - 1;
            gx[i] = cx2;
            gy[i] = cy2;
            gc[cy2 * cols + cx2]++;
        }
        let run = 0;
        for (c = 0; c < M; c++) {
            gs2[c] = run;
            gcur[c] = run;
            run += gc[c];
        }
        gs2[M] = run;
        for (i = 0; i < N; i++) {
            c = gy[i] * cols + gx[i];
            gord[gcur[c]++] = i;
        }
        const Rl = st.sep * (1.5 + 1.7 * op);
        const R2 = Rl * Rl;
        const seg = st.seg;
        const sc = st.sc;
        const deg = st.deg;
        const LC = st.LC;
        const MD = st.MD;
        sc.fill(0);
        deg.fill(0);
        for (i = 0; i < N; i++) {
            if (deg[i] >= MD || bk[i] < 0)
                continue;
            const xi = px[i];
            const yi = py[i];
            const g0 = gx[i];
            const h0 = gy[i];
            const hue = st.hu[i] + (op > 0 ? st.cv[i] : 0);
            fuera: for (let yg = h0 - 1; yg <= h0 + 1; yg++) {
                if (yg < 0 || yg >= rows)
                    continue;
                const ro2 = yg * cols;
                for (let xg = g0 - 1; xg <= g0 + 1; xg++) {
                    if (xg < 0 || xg >= cols)
                        continue;
                    c = ro2 + xg;
                    e = gs2[c + 1];
                    for (let p2 = gs2[c]; p2 < e; p2++) {
                        j = gord[p2];
                        if (j <= i || deg[j] >= MD || bk[j] < 0)
                            continue;
                        const ddx = px[j] - xi;
                        const ddy = py[j] - yi;
                        const d2 = ddx * ddx + ddy * ddy;
                        if (d2 >= R2)
                            continue;
                        const lf = 1 - d2 / R2;
                        const lv = lf < 0.34 ? 0 : (lf < 0.68 ? 1 : 2);
                        const hg = hue + st.hu[j] + (op > 0 ? st.cv[j] : 0);
                        const fam = hg < -0.3 ? 2 : (hg < 0.02 ? 1 : 0);
                        b = fam * 3 + lv;
                        n = sc[b];
                        if (n < LC) {
                            o = (b * LC + n) * 4;
                            seg[o] = xi;
                            seg[o + 1] = yi;
                            seg[o + 2] = px[j];
                            seg[o + 3] = py[j];
                            sc[b] = n + 1;
                        }
                        deg[j]++;
                        if (++deg[i] >= MD)
                            break fuera;
                    }
                }
            }
        }
        for (b = 0; b < 9; b++) {
            n = sc[b];
            if (!n)
                continue;
            ctx.strokeStyle = st.lin[(b / 3) | 0];
            ctx.globalAlpha = st.lvl[b % 3] * lk;
            ctx.lineWidth = st.lwd[b % 3];
            ctx.beginPath();
            const lb2 = b * st.LC * 4;
            for (k = 0; k < n; k++) {
                o = lb2 + k * 4;
                ctx.moveTo(seg[o], seg[o + 1]);
                ctx.lineTo(seg[o + 2], seg[o + 3]);
            }
            ctx.stroke();
        }
    }
    /* --------- halos --------- */
    if (st.warmA && st.warmB) {
        const nh = st.nh;
        const hl = st.hl;
        const hf = st.hf;
        for (k = 0; k < nh; k++) {
            i = hl[k];
            const hav = ha[i];
            if (hav < 0.03)
                continue;
            const hr = rad[i] * (4.6 + 4.4 * reposo + 1.6 * op);
            ctx.globalAlpha = hav > 0.8 ? 0.8 : hav;
            ctx.drawImage(hf[i] ? st.warmB : st.warmA, px[i] - hr, py[i] - hr, hr * 2, hr * 2);
        }
    }
    /* --------- particulas: un solo trazo por cubo --------- */
    for (b = 0; b < NB; b++) {
        c = cnt[b];
        if (!c)
            continue;
        const end = off[b];
        const st0 = end - c;
        ctx.strokeStyle = st.pal[(b / (NA * NV)) | 0];
        ctx.globalAlpha = st.alp[((b / NV) | 0) % NA];
        ctx.lineWidth = st.wid[b % NV];
        ctx.beginPath();
        for (k = st0; k < end; k++) {
            i = ord[k];
            ctx.moveTo(qx[i], qy[i]);
            ctx.lineTo(px[i], py[i]);
        }
        ctx.stroke();
    }
    /* --------- onda de la frenada --------- */
    const wv = (av - 0.415) / 0.135;
    if (wv > 0 && wv < 1 && st.auroA) {
        const rx4 = st.bw * (0.6 + 0.34 * wv);
        const ry4 = st.bh * (1.4 + 1.5 * wv);
        ctx.globalAlpha = Math.sin(wv * 3.14159265) * 0.26;
        ctx.drawImage(st.auroA, VX - rx4, VY - ry4, rx4 * 2, ry4 * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
}
