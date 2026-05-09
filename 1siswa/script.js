const FIREBASE_URL = "https://jurnalku-49dbd-default-rtdb.asia-southeast1.firebasedatabase.app/jurusku";
const FIREBASE_USERS_URL = "https://jurnalku-49dbd-default-rtdb.asia-southeast1.firebasedatabase.app/jurusku_users";

let currentUser = null;
let chart = null;
let currentDate = new Date();
let data = {}; 
let usersData = {}; 

let viewLbDate = new Date(); // Default Leaderboard adalah bulan saat ini
let viewDashDate = new Date(); // Default Dashboard adalah bulan saat ini
let currentPekan = 1; // Default Dashboard Pekan ke-1

// Variabel Filter Leaderboard (Default: Global)
let currentLbFilter = "global";

// === TAMBAHAN VARIABEL FITUR AVATAR (Hewan Lucu, Friendly, & Banyak) ===
const emotAvatars = [
    '🐱','🐹','🐰','🦊',
	'🐻','🐼','🐻‍❄️','🐨',
	'🐯','🦁','🐮','🐸',
	'🐵','🐶','🦝','🐺',
    '🐣','🐤','🐥','🐔',
	'🐦','🐧','🕊️','🦉',
	'🦆','🦢','🦩','🦚',
	'🦜','🐢','🐡','🐠',
    '🐟','🐬','🐳','🐋',
	'🐘','🦒','🦘','🐏',
	'🐑','🐐','🦌','🐕',
	'🐩','🐈','🐇','🐿️',
	'🦫','🦔','🦦','🦥',
	'🦄','🐴','🐲','🦋'
];
let cropper = null;
let originalAvatarData = ""; 
let currentAvatarData = "";  
// ======================================

const jadwalSholat = { 'Subuh': {mulai:"04:00",akhir:"05:30"}, 'Dzuhur': {mulai:"11:30",akhir:"15:00"}, 'Ashar': {mulai:"15:00",akhir:"18:00"}, 'Maghrib':{mulai:"17:20",akhir:"19:15"}, 'Isya': {mulai:"18:20",akhir:"23:59"} };

function safeKey(str) { return str.replace(/\./g, ','); }
function restoreKey(str) { return str.replace(/,/g, '.'); }

function showToast(msg) {
    let x = document.getElementById("toast");
    x.innerHTML = msg; 
    x.className = "show";
    setTimeout(() => { x.className = x.className.replace("show", ""); }, 3000);
}

function formatTanggalKey() { 
    let d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); 
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error);
    });
}

function togglePass() {
    let passInput = document.getElementById("password");
    let icon = document.getElementById("togglePassword");
    if (passInput.type === "password") {
        passInput.type = "text";
        icon.innerText = "😮";
    } else {
        passInput.type = "password";
        icon.innerText = "😴";
    }
}

// === TAMBAHAN FUNGSI FITUR AVATAR ===
function renderEmotAvatars() {
    let container = document.getElementById("emotContainer");
    if(!container) return;
    container.innerHTML = "";
    
	container.style.maxHeight = "260px";
    container.style.overflowY = "auto";
    container.style.overscrollBehavior = "contain"; 
    container.style.padding = "5px";
    container.style.justifyContent = "center";

    emotAvatars.forEach(emot => {
        let btn = document.createElement("div");
        btn.innerText = emot;
        btn.style.cssText = "font-size: 2.2rem; cursor: pointer; padding: 5px; border-radius: 10px; background: #f1f5f9; transition: all 0.2s;";
		btn.onclick = () => {
            selectEmotAvatar(emot);
            document.getElementById('avatarModal').style.display = 'none';
            document.body.style.overflow = 'auto'; 
        };
        container.appendChild(btn);
    });
}

function showAvatarModal() { 
    document.getElementById('avatarModal').style.display = 'flex'; 
    document.body.style.overflow = 'hidden'; 
}

function showHapusModal() { document.getElementById('hapusModal').style.display = 'flex'; }

function selectEmotAvatar(emot) {
    currentAvatarData = emot;
    document.getElementById("profilAvatarDisplay").innerHTML = emot;
    document.getElementById("editAvatar").value = "";
    showToast("✔️ Avatar dipilih, untuk Perubahan tekan Simpan.");
}

function confirmHapusAvatar() {
    let randomAvatar = emotAvatars[Math.floor(Math.random() * emotAvatars.length)];
    currentAvatarData = randomAvatar;
    document.getElementById("profilAvatarDisplay").innerHTML = randomAvatar;
    document.getElementById("editAvatar").value = "";
    document.getElementById('hapusModal').style.display = 'none';
    showToast("🗑️ Foto dihapus (diganti hewan acak), untuk Perubahan tekan Simpan.");
}

function batalUbahAvatar(showToastMsg = false) {
    currentAvatarData = originalAvatarData;
    updateAvatarDisplay();
    document.getElementById("editAvatar").value = "";
    if (showToastMsg) showToast("❌ Perubahan foto dibatalkan.");
}


function previewCrop(event) {
    let file = event.target.files[0];
    
    if (!file) return;

    if (!file.type.match('image.*')) {
        showToast("❌ Gagal! Hanya boleh memilih file Foto/Gambar (JPG, PNG, dll).");
        event.target.value = ""; 
        return;
    }

    let reader = new FileReader();
    reader.onload = function(e) {
        let image = document.getElementById('imageToCrop');
        image.src = e.target.result;
        document.getElementById('cropModal').style.display = "flex";
        if (cropper) cropper.destroy();
        cropper = new Cropper(image, { aspectRatio: 1, viewMode: 1 });
    }
    reader.readAsDataURL(file);
}

function cancelCrop() {
    document.getElementById('cropModal').style.display = "none";
    document.getElementById("editAvatar").value = "";
    if (cropper) { cropper.destroy(); cropper = null; }
}

function saveCrop() {
    if (!cropper) return;

    let canvas = cropper.getCroppedCanvas({
        width: 300,
        height: 300,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });

    let compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
    currentAvatarData = compressedBase64; 
    updateAvatarDisplay();

    document.getElementById('cropModal').style.display = "none";
    cropper.destroy(); 
    cropper = null;
    showToast("📸 Foto dipilih, untuk Perubahan tekan Simpan.");
}

function updateAvatarDisplay() {
    let profAva = document.getElementById("profilAvatarDisplay");
    if(profAva) {
        profAva.style.backgroundColor = "#fff";
        profAva.style.borderColor = "#228b22"; 
    }

    if(currentAvatarData && currentAvatarData.startsWith('data:image')) {
        profAva.innerHTML = `<img src="${currentAvatarData}" style="width:100%; height:100%; object-fit:cover;">`;
    } else {
        profAva.innerHTML = currentAvatarData || "👤"; 
    }
}
// === END TAMBAHAN FUNGSI FITUR AVATAR ===

// === LOGIKA E-ASESMEN FULL SCREEN ===
function mulaiUjian(url) {
    let elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => console.log(err));
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
    document.getElementById('examFrame').src = url;
    document.getElementById('examContainer').style.display = "block";
}

function closeExam() {
    if(confirm("Apakah kamu yakin ingin keluar dari halaman ujian? Pastikan jawaban sudah dikirim!")) {
        document.getElementById('examContainer').style.display = "none";
        document.getElementById('examFrame').src = "";
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => console.log(err));
        } else if (document.webkitExitFullscreen) { 
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { 
            document.msExitFullscreen();
        }
    }
}

// === LOGIKA DEEP LINKING KE GOOGLE CHROME ===
function bukaDiChrome(url) {
    let cleanUrl = url.replace(/^https?:\/\//, '');
    let userAgent = navigator.userAgent || navigator.vendor || window.opera;

    if (/android/i.test(userAgent)) {
        window.location.href = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
    } 
    else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        let scheme = url.startsWith('https') ? 'googlechromes://' : 'googlechrome://';
        window.location.href = scheme + cleanUrl;
        setTimeout(() => { window.location.href = url; }, 500);
    } 
    else {
        window.open(url, '_blank');
    }
}

async function loadDatabase() {
    try {
        let [resData, resUsers] = await Promise.all([ fetch(FIREBASE_URL + ".json"), fetch(FIREBASE_USERS_URL + ".json") ]);
        data = (await resData.json()) || {}; usersData = (await resUsers.json()) || {};
    } catch (e) { console.log("Gagal mengambil update Realtime."); }
}

async function syncToFirebase() {
    let t = formatTanggalKey();
    await fetch(`${FIREBASE_URL}/${t}/${currentUser}.json`, { method: 'PUT', body: JSON.stringify(data[t][currentUser]) });
    await loadDatabase();
    if(document.getElementById('leaderboard').style.display === "block") renderLeaderboard();
}

async function login() {
    let rawU = document.getElementById("username").value.trim();
    let p = document.getElementById("password").value.trim();
    
    if (/[\#\$\[\]]/.test(rawU)) { showToast("⚠️ Username tidak boleh menggunakan simbol khusus."); return; }
    if (!rawU || !p) { showToast("⚠️ Harap isi Username dan Password."); return; }
    
    let btn = document.getElementById("btnLogin"); btn.innerText = "Memeriksa..."; btn.disabled = true;

    try {
        let dbKey = safeKey(rawU); 
        let res = await fetch(FIREBASE_USERS_URL + "/" + dbKey + ".json");
        let userData = await res.json();

        if (!userData) {
            showToast("❌ Akun tidak ditemukan. Mengembalikan ke halaman login...");
            
            localStorage.removeItem("jurusku_user"); 
            localStorage.removeItem("jurusku_pass");
            localStorage.removeItem("saved_user");
            localStorage.removeItem("saved_pass");
            localStorage.removeItem("saved_pin");
            
            if (document.getElementById("pinPage")) document.getElementById("pinPage").style.display = "none";
            if (document.getElementById("menu")) document.getElementById("menu").style.display = "none";
            document.querySelectorAll(".page").forEach(p => p.style.display = "none");
            document.getElementById("loginPage").style.display = "block";
            
            document.getElementById("username").value = "";
            document.getElementById("password").value = "";
            
            btn.innerText = "Masuk"; 
            btn.disabled = false; 
            return;
        }

        if (userData.password !== p) {
            showToast("❌ Password salah. Silakan coba lagi.");
            
            // PERBAIKAN: Bersihkan storage agar tidak stuck saat auto-login gagal
            localStorage.removeItem("jurusku_user"); 
            localStorage.removeItem("jurusku_pass");
            localStorage.removeItem("saved_user");
            localStorage.removeItem("saved_pass");
            
            // PERBAIKAN: Kembalikan UI ke halaman login
            if (document.getElementById("menu")) document.getElementById("menu").style.display = "none";
            document.querySelectorAll(".page").forEach(page => page.style.display = "none");
            document.getElementById("loginPage").style.display = "block";
            
            document.getElementById("password").value = ""; // Kosongkan input password
            
            btn.innerText = "Masuk"; btn.disabled = false; return;
        }

        currentUser = dbKey; 
        
        localStorage.setItem("jurusku_user", rawU); 
        localStorage.setItem("jurusku_pass", p);
        localStorage.setItem("saved_user", rawU);
        localStorage.setItem("saved_pass", p);

        await loadDatabase();

        let userNama = userData.nama || rawU;
        let userKelas = userData.kelas || "-";
        
        document.getElementById("greetName").innerText = userNama;
        document.getElementById("userLabel").innerText = userNama + " | " + userKelas;
        document.getElementById("usernameLabel").innerText = "Username: " + rawU;
        document.getElementById("editNama").value = userNama;
        document.getElementById("editKelas").value = userKelas;
        document.getElementById("editPassword").value = p;
        
        if (userData.avatar && userData.avatar !== "🧑") { 
            originalAvatarData = userData.avatar; 
        } else { 
            let randomAvatar = emotAvatars[Math.floor(Math.random() * emotAvatars.length)];
            originalAvatarData = randomAvatar;
            fetch(FIREBASE_USERS_URL + "/" + currentUser + ".json", { 
                method: 'PATCH',
                body: JSON.stringify({ avatar: randomAvatar }) 
            });
        }
        
        currentAvatarData = originalAvatarData;
        updateAvatarDisplay();
        renderEmotAvatars();
        
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("menu").style.display = "flex";
        showPage("monitor");
        tampilTanggal(); loadKebiasaan();
        startRealtimeRefresh();
		
    } catch (e) { showToast("Gagal terhubung ke server."); }
    
    btn.innerText = "Masuk"; btn.disabled = false;
}

let pollingInterval = null;
function startRealtimeRefresh() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        if (currentUser) {
            let activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
            let isTyping = (activeTag === "textarea" || activeTag === "input");

            await loadDatabase();
            
            let savedPass = localStorage.getItem("jurusku_pass");
            if (!usersData[currentUser] || usersData[currentUser].password !== savedPass) {
                showToast("⚠️ Sesi berakhir! Username atau Password telah diubah oleh Admin.");
                clearInterval(pollingInterval); 
                setTimeout(() => { logout(); }, 2500);
                return; 
            }

            if(document.getElementById('monitor').style.display === 'block' && !isTyping) {
                loadKebiasaan();
            }
            if(document.getElementById('dashboard').style.display === 'block') updateView();
            if(document.getElementById('leaderboard').style.display === 'block') renderLeaderboard();
        }
    }, 15000); 
}

async function simpanProfil() {
    let newN = document.getElementById("editNama").value.trim();
    let newK = document.getElementById("editKelas").value.trim();
    let newP = document.getElementById("editPassword").value.trim();

    if (!newN || !newP || !newK) { showToast("⚠️ Data profil tidak boleh kosong."); return; }

    let btn = document.getElementById("btnSimpanProfil"); btn.innerText = "Menyimpan..."; btn.disabled = true;

    try {
        let newAvatarBase64 = currentAvatarData; 

        await fetch(FIREBASE_USERS_URL + "/" + currentUser + ".json", { 
            method: 'PATCH',
            body: JSON.stringify({ nama: newN, kelas: newK, password: newP, avatar: newAvatarBase64 }) 
        });

        localStorage.setItem("jurusku_pass", newP);
        localStorage.setItem("saved_pass", newP); 
        document.getElementById("userLabel").innerText = newN + " | " + newK;
        document.getElementById("greetName").innerText = newN; 
        
        originalAvatarData = newAvatarBase64;
        updateAvatarDisplay();
        document.getElementById("editAvatar").value = "";

        await loadDatabase();
        showToast("✅ Profil berhasil diperbarui.");
        
        if (currentLbFilter !== "global") renderLeaderboard(); 
    } catch (e) { showToast("Server sedang bermasalah."); }

    btn.innerText = "Simpan"; btn.disabled = false;
}

function logout() {
    localStorage.removeItem("jurusku_user"); 
    localStorage.removeItem("jurusku_pass"); 
    location.reload(); 
}

function konfirmasiLogout() {
    const confirmToast = document.getElementById("confirmToast");
    const overlay = document.getElementById("overlay");
    
    confirmToast.querySelector("div").innerText = "🚪"; 
    confirmToast.querySelector("p").innerHTML = "Apakah kamu yakin ingin keluar?<br>kamu harus login ulang nanti.";
    
    confirmToast.querySelector(".btn-ya").setAttribute("onclick", "logout()");
    confirmToast.querySelector(".btn-tidak").setAttribute("onclick", "tutupKonfirmasiLogout()");
    
    confirmToast.classList.add("show");
    overlay.classList.add("show");
}

function tutupKonfirmasiLogout() {
    document.getElementById("confirmToast").classList.remove("show");
    document.getElementById("overlay").classList.remove("show");
    
    setTimeout(() => {
        document.getElementById("confirmToast").querySelector(".btn-ya").setAttribute("onclick", "confirmSleep(true)");
        document.getElementById("confirmToast").querySelector(".btn-tidak").setAttribute("onclick", "confirmSleep(false)");
    }, 300);
}

function getHariIni() {
    let t = formatTanggalKey();
    if (!data[t]) data[t] = {};
    if (!data[t][currentUser]) data[t][currentUser] = { poin: 0, pilar: { sholat:0, olahraga:0, makan:0, belajar:0, masyarakat:0, bangun:0, tidur:0 }, inputs: { olahraga: "", makan: "", belajar: "", masyarakat: "" } };
    return data[t][currentUser];
}

function showPage(id) {
    if (id !== 'leaderboard') {
        viewLbDate = new Date(); 
        currentLbFilter = "global"; 
        document.querySelectorAll('.lb-filter-btn').forEach(btn => btn.classList.remove('active'));
        const globalBtn = document.getElementById('filter-global');
        if (globalBtn) globalBtn.classList.add('active');
    }

    if (id !== 'leaderboard') {
        currentLbFilter = "global";
        viewLbDate = new Date();
    }

    if (id !== 'setting' && typeof batalUbahAvatar === 'function') {
        batalUbahAvatar(false);
    }

    document.querySelectorAll(".page").forEach(p => p.style.display = "none");
    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    
    document.getElementById(id).style.display = "block";
    document.getElementById("btn-" + id).classList.add("active");
    
    if(id === 'dashboard' || id === 'monitor') {
        document.getElementById("greetingBar").style.display = "block";
    } else {
        document.getElementById("greetingBar").style.display = "none";
    }

    if(id === 'dashboard') {
        let now = new Date();
        viewDashDate = new Date(); 
        let dateNum = now.getDate();
        
        if (dateNum <= 7) currentPekan = 1;
        else if (dateNum <= 14) currentPekan = 2;
        else if (dateNum <= 21) currentPekan = 3;
        else currentPekan = 4;
        
        document.querySelectorAll('.dash-filter-btn').forEach(btn => btn.classList.remove('active'));
        let activeBtn = document.getElementById('filter-pekan-' + currentPekan);
        if(activeBtn) activeBtn.classList.add('active');
        
        updateView(); 
    }

    if(id === 'leaderboard') {
        loadDatabase().then(() => { renderLeaderboard(); });
    }
}

function setLbFilter(filter) {
    currentLbFilter = filter;
    document.querySelectorAll('.lb-filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter-' + filter).classList.add('active');
    renderLeaderboard();
}

function changeLbMonth(offset) {
    viewLbDate.setMonth(viewLbDate.getMonth() + offset);
    renderLeaderboard();
}

function renderLeaderboard() {
    let userScoresTotal = {};
    let userCounts = {}; 
    
    const namaBulanArr = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
	const tanggalSekarang = viewLbDate; 
	const bulanSekarang = tanggalSekarang.getMonth() + 1; 
	const tahunSekarang = tanggalSekarang.getFullYear();
    
	const namaBulan = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
	const labelBulan = namaBulan[viewLbDate.getMonth()];
	const labelTahun = viewLbDate.getFullYear();

	document.getElementById("judulLeaderboardBulan").innerText = `${labelBulan} ${labelTahun}`;

    if(labelBulan) { labelBulan.innerText = "BULAN " + namaBulanArr[tanggalSekarang.getMonth()]; }

    for (let dateStr in data) { 
        let parts = dateStr.split('-');
        if(parts.length === 3) {
            let y = parseInt(parts[0]);
            let m = parseInt(parts[1]);
            
            if(y === tahunSekarang && m === bulanSekarang) {
                for (let user in data[dateStr]) {
                    if (!userScoresTotal[user]) {
                        userScoresTotal[user] = 0;
                        userCounts[user] = 0;
                    }
                    userScoresTotal[user] += (data[dateStr][user].poin || 0);
                    userCounts[user]++; 
                }
            }
        }
    }

    let userAvgScores = {};
    for (let user in userScoresTotal) {
        userAvgScores[user] = Math.round(userScoresTotal[user] / userCounts[user]);
    }

    let myKelas = "";
    let myGrade = "";
    if (currentUser && usersData[currentUser]) {
        myKelas = usersData[currentUser].kelas || "-";
        myGrade = myKelas.match(/\d+/)?.[0] || "-"; 
    }

    let rawUsers = Object.keys(userAvgScores).map(user => { 
        return { username: user, score: userAvgScores[user], totalScore: userScoresTotal[user] }; 
    });

    let filteredUsers = rawUsers.filter(u => {
        if (!usersData[u.username]) return false;

        let uKelas = usersData[u.username]?.kelas || "-";
        if (currentLbFilter === 'regional') {
            let uGrade = uKelas.match(/\d+/)?.[0] || "-";
            return uGrade === myGrade && myGrade !== "-";
        } else if (currentLbFilter === 'kelas') {
            return uKelas === myKelas && myKelas !== "-";
        }
        return true;
    });

    let sortedUsers = filteredUsers.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score; 
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore; 
        return a.username.localeCompare(b.username); 
    });

    for (let i = 1; i < sortedUsers.length; i++) {
        if (sortedUsers[i].score >= sortedUsers[i-1].score) {
            sortedUsers[i].score = Math.max(0, sortedUsers[i-1].score - 1);
        }
    }

    let podiumHtml = ''; 
    let podiumIndices = [1, 0, 2]; 
    let podiumClasses = ['podium-2', 'podium-1', 'podium-3']; 
    let fallbackAvatars = ['🐼', '🐰', '🐱']; 
    let medals = ['🥈', '🥇', '🥉'];
    let podiumBorderColors = ['#ffb74d', '#ffd700', '#ff9800']; 
    let podiumScoreSizes = ['1.4rem', '1.7rem', '1.2rem'];
    let podiumAvatarSizes = ['2.4rem', '3.4rem', '2rem'];

    for (let i = 0; i < 3; i++) {
        let indexArray = podiumIndices[i];
        if (sortedUsers[indexArray]) {
            let u = sortedUsers[indexArray];
            let uData = usersData[u.username] || {};
            let namaTampil = uData.nama || restoreKey(u.username);
            let uKelas = uData.kelas ? uData.kelas : '-';
            
            let userAva = (uData.avatar && uData.avatar !== "🧑") ? uData.avatar : fallbackAvatars[i];
            let avatarHTML = userAva.startsWith('data:image') ? `<img src="${userAva}">` : userAva;
            let rankBadge = `<div class="rank-badge" style="color:#000; border: 2px solid ${podiumBorderColors[i]};">${medals[i]}</div>`;
            
            podiumHtml += `
            <div class="lb-podium-item ${podiumClasses[i]}" style="background: #fff !important; border: 3px solid ${podiumBorderColors[i]}; border-radius: 20px;">
                <div class="lb-avatar" style="background: #fff; border: 4px solid ${podiumBorderColors[i]} !important; font-size:${podiumAvatarSizes[i]};">
                    ${avatarHTML}
                    ${rankBadge}
                </div>
                <div class="lb-podium-name">${namaTampil}</div>
                <div class="lb-podium-kelas">Kelas ${uKelas}</div>
                <div class="lb-podium-score" style="font-size: ${podiumScoreSizes[i]};">${u.score}</div>
            </div>`;
        } else {
            podiumHtml += `<div class="lb-podium-item ${podiumClasses[i]}" style="background: #fff !important; border: 3px solid ${podiumBorderColors[i]}; opacity:0.5; justify-content:center; border-radius: 20px;"><div class="lb-podium-name">-</div><div class="lb-podium-score" style="font-size: ${podiumScoreSizes[i]};">0</div></div>`;
        }
    }
    document.getElementById("lb-podium-container").innerHTML = podiumHtml;
    
    let listHtml = '';
    const borderHijauForest = '#228b22';

    for (let i = 3; i < 10; i++) {
        if (sortedUsers[i]) {
            let u = sortedUsers[i]; 
            let uData = usersData[u.username] || {}; 
            let namaTampil = uData.nama || restoreKey(u.username); 
            let uKelas = uData.kelas ? uData.kelas : '-';
            
            let fallbackIndex = u.username.length % emotAvatars.length;
            let fallbackAvatar = emotAvatars[fallbackIndex]; 
            
            let userAva = (uData.avatar && uData.avatar !== "🧑") ? uData.avatar : fallbackAvatar;
            let avatarHTML = userAva.startsWith('data:image') ? `<img src="${userAva}">` : userAva;
            
            listHtml += `<div class="lb-item"><div class="lb-item-num">${i + 1}</div><div class="lb-item-avatar" style="background:#fff; border: 2px solid ${borderHijauForest}; font-size:1.5rem;">${avatarHTML}</div><div class="lb-item-info"><div style="display:flex; flex-direction:column; max-width: 70%;"><span class="lb-item-name">${namaTampil}</span><span style="font-size:0.75rem; color:#94a3b8; font-weight:bold; margin-top:3px;">Kelas ${uKelas}</span></div><span class="lb-item-score" style="font-size: 1.1rem;">${u.score}</span></div></div>`;
        }
    }
    
    if(!listHtml && sortedUsers.length <= 3) {
        listHtml = `<div style="text-align:center; padding: 20px; color:#ffffff;">Belum ada data peringkat untuk bulan ini dengan filter ini.</div>`;
    }
    document.getElementById("lb-list-container").innerHTML = listHtml;
}

function tampilTanggal() { document.getElementById("tanggalMonitor").innerText = currentDate.toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
function updatePilarPoin(pilar, val) { let hari = getHariIni(); hari.pilar[pilar] = val; hari.poin = Object.values(hari.pilar).reduce((a, b) => a + b, 0); document.getElementById("totalPoin").innerText = hari.poin; syncToFirebase(); }

function catatBangun() { 
    let hari = getHariIni(); 
    if (hari.bangun) { showToast("✅ Aktivitas sudah diisi."); return; }
    if (hari.tidur_val) { showToast("🔒 Terkunci tidak bisa diisi karena sudah tidur."); return; }

    let jamMenit = new Date().getHours() + (new Date().getMinutes()/60); 
    let jamString = new Date().toLocaleTimeString("id-ID", {hour:'2-digit', minute:'2-digit'}); 
    hari.bangun = jamString; 

    if (jamMenit >= 3.0 && jamMenit <= 5.0) { 
        updatePilarPoin('bangun', 20); showToast("☀️ Bangun pagi tepat waktu! <strong>+20 Poin</strong>"); 
    } else { 
        updatePilarPoin('bangun', 0); showToast("⚠️ Kamu bangun pukul " + jamString + ". Usahakan lebih pagi! <strong>(0 Poin)</strong>"); 
    } 
    loadKebiasaan(); 
}

function checkSholat(nama, mulai, akhir) { 
    let hari = getHariIni(); 
    if (hari.tidur_val) { showToast("⚠️ Waktu sholat " + nama + " telah usai."); return; }

    let jamSekarang = new Date().getHours().toString().padStart(2, '0') + ":" + new Date().getMinutes().toString().padStart(2, '0'); 
    if (jamSekarang >= mulai && jamSekarang <= akhir) { 
        hari['sholat_'+nama] = true; 
        updatePilarPoin('sholat', (hari.pilar.sholat || 0) + 10); 
        showToast("✅ Alhamdulillah sudah sholat " + nama + "! <strong>+10 Poin</strong>"); 
        loadKebiasaan(); 
    } else { 
        showToast("⚠️ Waktu sholat " + nama + " belum dimulai."); 
    } 
}

function simpanInput(pilar) {
    let hari = getHariIni(); 
    if (hari.inputs[pilar]) { showToast("✅ Aktivitas sudah diisi."); return; }
    if (hari.tidur_val) { showToast("🔒 Terkunci tidak bisa diisi karena sudah tidur."); return; }
    
    let text = document.getElementById("input-" + pilar).value.trim();
    if (!text) { showToast("⚠️ Harap isi deskripsi aktivitas terlebih dahulu."); return; }
    
    hari.inputs[pilar] = text;

    let poinDasar = (text.length > 0 && text.length < 20) ? 1 : Math.min(Math.floor(text.length / 20) * 10, 30);
    let bonus = 0; let t = text.toLowerCase(); 
    switch (pilar) { case 'olahraga': if (/(sepak bola|lari|sepeda|renang|basket|voli|senam)/i.test(t)) bonus = 5; break; case 'makan': if (/(susu|sayur|buah|air putih|daging|ikan|telur)/i.test(t)) bonus = 5; break; case 'belajar': if (/(ipa|mtk|matematika|ips|bahasa|agama|sejarah|inggris)/i.test(t)) bonus = 15; break; case 'masyarakat': if (/(ayah|ibu|teman)/i.test(t) || /[A-Z]/.test(text)) bonus = 10; break; }
    
    let totalPoin = poinDasar + bonus; 
    updatePilarPoin(pilar, totalPoin); 
    
    showToast("✅ Aktivitas berhasil disimpan! <strong>+" + totalPoin + " Poin</strong>"); 
    loadKebiasaan(); 
}

function catatTidur() { 
    let hari = getHariIni(); 
    if (hari.tidur_val) { showToast("✅ Aktivitas sudah diisi."); return; }
    
    if (!hari['sholat_Isya']) { showToast("⚠️ <strong>Belum sholat Isya!</strong><br>Harus diselesaikan sebelum tidur."); return; } 
    
    let isOlahragaFilled = !!hari.inputs.olahraga;
    let isMakanFilled = !!hari.inputs.makan;
    let isBelajarFilled = !!hari.inputs.belajar;
    let isMasyarakatFilled = !!hari.inputs.masyarakat;
    
    if (isOlahragaFilled && isMakanFilled && isBelajarFilled && isMasyarakatFilled) {
        prosesCatatTidur();
    } else {
        document.getElementById("confirmToast").classList.add("show");
        document.getElementById("overlay").classList.add("show");
    }
}

function confirmSleep(isYes) {
    document.getElementById("confirmToast").classList.remove("show");
    document.getElementById("overlay").classList.remove("show");

    if (isYes) { prosesCatatTidur(); } 
    else { showToast("Aksi mencatat waktu tidur dibatalkan."); }
}

function prosesCatatTidur() {
    let hari = getHariIni(); 
    let jamMenit = new Date().getHours() + (new Date().getMinutes()/60); 
    let jamString = new Date().toLocaleTimeString("id-ID", {hour:'2-digit', minute:'2-digit'}); 
    hari.tidur_val = jamString; 
    
    let p = jamMenit < 20.0 ? 20 : (jamMenit < 21.0 ? 10 : (jamMenit <= 22.0 ? 5 : 0)); 
    updatePilarPoin('tidur', p); 
    
    if (p > 0) { showToast("🌙 <strong>Selamat beristirahat!</strong><br>Semua aktivitas terkunci. +" + p + " Poin"); } 
    else { showToast("⚠️ <strong>Tidur terlalu larut malam!</strong><br>Semua aktivitas terkunci. (0 Poin)"); }
    
    loadKebiasaan();
}

function loadKebiasaan() {
    let hari = getHariIni(); 
    let jamSekarang = new Date().getHours().toString().padStart(2, '0') + ":" + new Date().getMinutes().toString().padStart(2, '0');
    
    let isTidur = !!hari.tidur_val; 

    let clsBangun = (hari.bangun || isTidur) ? "btn-disabled" : "";
    let clsTidur = hari.tidur_val ? "btn-disabled" : "";
    
    let isOlahragaLocked = isTidur || !!hari.inputs.olahraga;
    let clsOlahraga = isOlahragaLocked ? "btn-disabled" : "";
    let attrOlahraga = isOlahragaLocked ? `readonly class="locked-input" onclick="showToast('${hari.inputs.olahraga ? '✅ Aktivitas sudah diisi.' : '🔒 Terkunci tidak bisa diisi karena sudah tidur.'}')"` : '';

    let isMakanLocked = isTidur || !!hari.inputs.makan;
    let clsMakan = isMakanLocked ? "btn-disabled" : "";
    let attrMakan = isMakanLocked ? `readonly class="locked-input" onclick="showToast('${hari.inputs.makan ? '✅ Aktivitas sudah diisi.' : '🔒 Terkunci tidak bisa diisi karena sudah tidur.'}')"` : '';

    let isBelajarLocked = isTidur || !!hari.inputs.belajar;
    let clsBelajar = isBelajarLocked ? "btn-disabled" : "";
    let attrBelajar = isBelajarLocked ? `readonly class="locked-input" onclick="showToast('${hari.inputs.belajar ? '✅ Aktivitas sudah diisi.' : '🔒 Terkunci tidak bisa diisi karena sudah tidur.'}')"` : '';

    let isMasyarakatLocked = isTidur || !!hari.inputs.masyarakat;
    let clsMasyarakat = isMasyarakatLocked ? "btn-disabled" : "";
    let attrMasyarakat = isMasyarakatLocked ? `readonly class="locked-input" onclick="showToast('${hari.inputs.masyarakat ? '✅ Aktivitas sudah diisi.' : '🔒 Terkunci tidak bisa diisi karena sudah tidur.'}')"` : '';
    
    let html = `
        <div class="card">
            <h3>☀️ 1. Bangun Pagi <span class="point-tag">${hari.pilar.bangun} Poin</span></h3>
            <button class="primary ${clsBangun}" onclick="catatBangun()">
                ${hari.bangun ? "Aktivitas sudah diisi" : (isTidur ? "Sudah Tidur" : "Catat Waktu Bangun")}
            </button>
            <div class="badge">${hari.bangun ? "Jam: " + hari.bangun : "Belum diisi"}</div>
        </div>
        
        <div class="card">
            <h3>🙏 2. Beribadah <span class="point-tag">${hari.pilar.sholat} Poin</span></h3>
            <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top:10px">
            ${Object.keys(jadwalSholat).map(s => { 
                let done = hari['sholat_'+s]; 
                let m = jadwalSholat[s].mulai; 
                let a = jadwalSholat[s].akhir; 
                let lewat = jamSekarang > a; 
                let wkt = jamSekarang >= m && jamSekarang <= a; 
                
                let bg = '#f1f5f9'; let textColor = '#94a3b8'; let icon = '&nbsp;'; let action = ''; 
                
                if (done) { 
                    bg = 'var(--primary)'; textColor = 'white'; icon = '✓'; 
                    action = `showToast('✅ Alhamdulillah sudah sholat ${s}.')`;
                } else if (lewat || isTidur) {
                    bg = 'var(--danger)'; textColor = 'white'; icon = '✕'; 
                    action = `showToast('⚠️ Waktu sholat ${s} telah usai.')`;
                } else if (wkt) { 
                    bg = '#3498db'; textColor = 'white'; icon = 'Mulai'; 
                    action = `checkSholat('${s}','${m}','${a}')`;
                } else {
                    action = `showToast('⚠️ Waktu sholat ${s} belum dimulai.')`;
                } 
                
                return `<button style="flex:1; border:none; padding:8px 0; background:${bg}; color:${textColor}; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; margin:0; border-radius:12px; cursor:pointer;" onclick="${action}">
                    <span style="font-size:0.75rem; font-weight:800;">${s}</span>
                    <span style="font-size:0.9rem; font-weight:900;">${icon}</span>
                </button>`; 
            }).join('')}
            </div>
        </div>

        <div class="card">
            <h3>⚽ 3. Berolahraga <span class="point-tag">${hari.pilar.olahraga} Poin</span></h3>
            <textarea id="input-olahraga" placeholder="${isTidur && !hari.inputs.olahraga ? 'Terkunci tidak bisa diisi karena sudah tidur.' : 'Olahraga apa yang kamu lakukan hari ini?'}" ${attrOlahraga}>${hari.inputs.olahraga}</textarea>
            <button class="primary ${clsOlahraga}" style="margin-top:8px; padding:10px;" onclick="simpanInput('olahraga')">${hari.inputs.olahraga ? "Aktivitas sudah diisi" : (isTidur ? "Sudah Tidur" : "Simpan Aktivitas")}</button>
        </div>

        <div class="card">
            <h3>🥗 4. Makan Sehat <span class="point-tag">${hari.pilar.makan} Poin</span></h3>
            <textarea id="input-makan" placeholder="${isTidur && !hari.inputs.makan ? 'Terkunci tidak bisa diisi karena sudah tidur.' : 'Makanan sehat apa yang kamu konsumsi hari ini?'}" ${attrMakan}>${hari.inputs.makan}</textarea>
            <button class="primary ${clsMakan}" style="margin-top:8px; padding:10px;" onclick="simpanInput('makan')">${hari.inputs.makan ? "Aktivitas sudah diisi" : (isTidur ? "Sudah Tidur" : "Simpan Aktivitas")}</button>
        </div>

        <div class="card">
            <h3>💡 5. Gemar Belajar <span class="point-tag">${hari.pilar.belajar} Poin</span></h3>
            <textarea id="input-belajar" placeholder="${isTidur && !hari.inputs.belajar ? 'Terkunci tidak bisa diisi karena sudah tidur.' : 'Apa yang kamu pelajari hari ini?'}" ${attrBelajar}>${hari.inputs.belajar}</textarea>
            <button class="primary ${clsBelajar}" style="margin-top:8px; padding:10px;" onclick="simpanInput('belajar')">${hari.inputs.belajar ? "Aktivitas sudah diisi" : (isTidur ? "Sudah Tidur" : "Simpan Aktivitas")}</button>
        </div>

        <div class="card">
            <h3>🤝 6. Bermasyarakat <span class="point-tag">${hari.pilar.masyarakat} Poin</span></h3>
            <textarea id="input-masyarakat" placeholder="${isTidur && !hari.inputs.masyarakat ? 'Terkunci tidak bisa diisi karena sudah tidur.' : 'Kegiatan sosial apa yang kamu lakukan hari ini?'}" ${attrMasyarakat}>${hari.inputs.masyarakat}</textarea>
            <button class="primary ${clsMasyarakat}" style="margin-top:8px; padding:10px;" onclick="simpanInput('masyarakat')">${hari.inputs.masyarakat ? "Aktivitas sudah diisi" : (isTidur ? "Sudah Tidur" : "Simpan Aktivitas")}</button>
        </div>

        <div class="card">
            <h3>🌙 7. Tidur Cepat <span class="point-tag">${hari.pilar.tidur} Poin</span></h3>
            <button class="primary ${clsTidur}" style="background:${hari.tidur_val ? '#cbd5e1' : '#6c5ce7'}" onclick="catatTidur()">${hari.tidur_val ? "Aktivitas sudah diisi" : "Catat Waktu Tidur"}</button>
            <div class="badge">${hari.tidur_val ? "Jam: " + hari.tidur_val : "Belum diisi"}</div>
        </div>
    `;
    document.getElementById("listKebiasaan").innerHTML = html; document.getElementById("totalPoin").innerText = hari.poin;
}

// === LOGIKA DASHBOARD (PROGRES) DENGAN PROTEKSI TANGGAL ===

function changeDashMonth(offset) {
    viewDashDate.setMonth(viewDashDate.getMonth() + offset);
    updateView();
}

function setDashPekan(pekan) {
    currentPekan = pekan;
    document.querySelectorAll('.dash-filter-btn').forEach(btn => btn.classList.remove('active'));
    let selectedBtn = document.getElementById('filter-pekan-' + pekan);
    if (selectedBtn) selectedBtn.classList.add('active');
    updateView();
}


async function updateView() {
    const namaBulan = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    let labelBulan = namaBulan[viewDashDate.getMonth()];
    let labelTahun = viewDashDate.getFullYear();
    document.getElementById("judulDashboardBulan").innerText = `${labelBulan} ${labelTahun}`;
    
    // --- LOGIKA UTAMA: SEMBUNYIKAN TOMBOL NEXT ---
    let today = new Date();
    let currentRealMonth = today.getMonth();
    let currentRealYear = today.getFullYear();
    let btnNext = document.getElementById("btnNextMonth");

    if (btnNext) {
        // Cek: Jika tahun yang dilihat >= tahun sekarang DAN bulan yang dilihat >= bulan sekarang
        const isFuture = (viewDashDate.getFullYear() > currentRealYear) || 
                         (viewDashDate.getFullYear() === currentRealYear && viewDashDate.getMonth() >= currentRealMonth);
        
        // Gunakan visibility hidden agar tata letak tidak bergeser, atau display none jika ingin hilang total
        btnNext.style.display = isFuture ? "none" : "block";
    }
    // --------------------------------------------

    let labelPekan = document.getElementById("labelDashPekan");
    let labelPekanRefleksi = document.getElementById("labelDashPekanRefleksi");

    let year = viewDashDate.getFullYear();
    let month = viewDashDate.getMonth();
    let todayD = today.getDate();
    
    let maxAllowedPekan = 4;
    
    if (year > currentRealYear || (year === currentRealYear && month > currentRealMonth)) {
        maxAllowedPekan = 0; 
    } else if (year === currentRealYear && month === currentRealMonth) {
        if (todayD <= 7) maxAllowedPekan = 1;
        else if (todayD <= 14) maxAllowedPekan = 2;
        else if (todayD <= 21) maxAllowedPekan = 3;
        else maxAllowedPekan = 4;
    }

    for (let i = 1; i <= 4; i++) {
        let btn = document.getElementById('filter-pekan-' + i);
        if (btn) {
            btn.classList.remove('active');
            btn.style.display = (maxAllowedPekan > 0 && i <= maxAllowedPekan) ? '' : 'none';
        }
    }

    if (maxAllowedPekan === 0) {
        renderGrafik([]);
        renderRiwayat([]);
        let evalBox = document.getElementById("evaluasiText");
        if (evalBox) { evalBox.value = ""; evalBox.placeholder = "Bulan belum dimulai..."; }
        if (labelPekan) labelPekan.innerText = "-";
        if (labelPekanRefleksi) labelPekanRefleksi.innerText = "-";
        return;
    }

    if (currentPekan > maxAllowedPekan) currentPekan = maxAllowedPekan;
    if (labelPekan) labelPekan.innerText = currentPekan;
    if (labelPekanRefleksi) labelPekanRefleksi.innerText = currentPekan;

    let activeBtn = document.getElementById('filter-pekan-' + currentPekan);
    if (activeBtn) activeBtn.classList.add('active');

    let startDay, endDay;
    if (currentPekan === 1) { startDay = 1; endDay = 7; }
    else if (currentPekan === 2) { startDay = 8; endDay = 14; }
    else if (currentPekan === 3) { startDay = 15; endDay = 21; }
    else if (currentPekan === 4) { startDay = 22; endDay = new Date(year, month + 1, 0).getDate(); }

    let selectedKeys = []; 
    let keysWithDataDescending = []; 

    for (let d = startDay; d <= endDay; d++) {
        if (year === currentRealYear && month === currentRealMonth && d > todayD) continue; 
        let dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        selectedKeys.push(dateKey);
    }

    for (let i = selectedKeys.length - 1; i >= 0; i--) {
        keysWithDataDescending.push(selectedKeys[i]);
    }

    renderGrafik(selectedKeys);
    renderRiwayat(keysWithDataDescending);
    await renderEvaluasi();
}


function renderGrafik(keysArr) {
    let labels = []; 
    let poinData = []; 
    
    keysArr.forEach(k => { 
        labels.push(k.split('-')[2]); 
        let h = (data[k] && data[k][currentUser]) ? data[k][currentUser] : null;
        poinData.push(h ? h.poin : 0); 
    });
    
    if (chart) chart.destroy(); 
    chart = new Chart(document.getElementById("chart"), { 
        type: "line", 
        data: { 
            labels: labels, 
            datasets: [{ 
                label: "Total Poin", 
                data: poinData, 
                borderColor: "#1db954", 
                backgroundColor: "rgba(29, 185, 84, 0.1)", 
                borderWidth: 3,
                fill: true,
                tension: 0.4, 
                pointRadius: 4, 
                pointBackgroundColor: "#1db954"
            }] 
        }, 
        options: { 
            scales: { 
                y: { 
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                } 
            }, 
            plugins: {
                legend: { display: false } 
            },
            animation: { duration: 800 } 
        } 
    });
}

async function renderEvaluasi() {
    let box = document.getElementById("evaluasiText");
    if (!box) return;

    box.value = "⏳ Memuat refleksi guru...";

    const blnNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const bulanTahun = `${blnNames[viewDashDate.getMonth()]}_${viewDashDate.getFullYear()}`;
    const path = `catatan_guru/${currentUser}/${bulanTahun}/Pekan_${currentPekan}`;

    try {
        const res = await fetch(`${FIREBASE_URL}/${path}.json`);
        const val = await res.json();
        
        if (val) {
            box.value = val;
        } else {
            box.value = "";
            box.placeholder = "Belum ada catatan dari guru untuk minggu ini...";
        }
    } catch (e) {
        box.value = "";
        box.placeholder = "Gagal memuat catatan dari server.";
    }
}

function renderRiwayat(keysArr) {
    let historyHtml = ``;
    if(keysArr.length === 0) { 
        historyHtml += `<p style="font-size:0.9rem; color:#64748b; text-align:center; padding: 20px;">Belum ada riwayat aktivitas pada pekan ini.</p>`; 
    } else {
        historyHtml += `<table class="history-table"><tr><th style="width:20%">Tanggal</th><th style="width:15%">Poin</th><th>Aktivitas</th></tr>`;
        keysArr.forEach(k => {
            // Mencegah error 'Cannot read properties of undefined' jika null
            let h = (data[k] && data[k][currentUser]) ? data[k][currentUser] : { poin: 0, inputs: {} }; 
            let details = [];
            
            if(h.bangun) details.push(`<strong>☀️ Bangun:</strong> ${h.bangun}`);
            
            let sholatDone = []; 
            ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].forEach(s => { if(h['sholat_'+s]) sholatDone.push(s); }); 
            if(sholatDone.length > 0) details.push(`<strong>🙏 Ibadah:</strong> ${sholatDone.join(', ')}`);
            
            if(h.inputs && h.inputs.olahraga) details.push(`<strong>⚽ Olahraga:</strong> "${h.inputs.olahraga}"`); 
            if(h.inputs && h.inputs.makan) details.push(`<strong>🥗 Makan:</strong> "${h.inputs.makan}"`); 
            if(h.inputs && h.inputs.belajar) details.push(`<strong>💡 Belajar:</strong> "${h.inputs.belajar}"`); 
            if(h.inputs && h.inputs.masyarakat) details.push(`<strong>🤝 Masyarakat:</strong> "${h.inputs.masyarakat}"`); 
            if(h.tidur_val) details.push(`<strong>🌙 Tidur:</strong> ${h.tidur_val}`);
            
            historyHtml += `<tr>
                <td style="white-space:nowrap; font-weight:bold;">${new Date(k).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}</td>
                <td style="font-weight:900; color:var(--primary); font-size:1.1rem; text-align:center">${h.poin}</td>
                <td class="detail-teks">${details.length > 0 ? details.join('<br>') : '<span style="color:var(--danger)">Belum ada aktivitas</span>'}</td>
            </tr>`;
        });
        historyHtml += `</table>`;
    }
    document.getElementById("historyContainer").innerHTML = historyHtml;
}

window.onload = function() {
    let u = localStorage.getItem("jurusku_user"); 
    let p = localStorage.getItem("jurusku_pass");

    if (u && p) { 
        document.getElementById("username").value = u; 
        document.getElementById("password").value = p; 
        login(); 
    } else {
        document.getElementById("loginPage").style.display = "block";
    }
}