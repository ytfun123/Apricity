/*
 * Apricity app language bridge.
 *
 * The site stores the interface language in localStorage['apricity-language'].
 * Apps in the APPS tab are same-origin iframes, so they share that storage and
 * can follow the setting without the launcher having to pass anything in.
 *
 * Include this with <script src="app-lang.js"></script> (../app-lang.js from a
 * subfolder). It then:
 *   - sets <html lang>,
 *   - translates any element whose text matches a key in PHRASES below,
 *   - translates placeholder=""/title="" attributes,
 *   - re-runs when the setting changes in another tab/frame, and when the app
 *     shows itself again,
 *   - watches the DOM so text drawn later (rendered lists, modals) is covered.
 *
 * Adding a phrase is one line in PHRASES. Unknown text is left untouched, so
 * apps stay usable in every language even where no translation exists yet.
 */
(function () {
  'use strict';

  var PHRASES = {
    'Search': { es: 'Buscar', fr: 'Rechercher', de: 'Suchen', 'pt-BR': 'Pesquisar', it: 'Cerca', nl: 'Zoeken', pl: 'Szukaj', ru: 'Поиск', tr: 'Ara', ja: '検索', zh: '搜索', hi: 'खोजें', uk: 'Пошук' },
    'Settings': { es: 'Ajustes', fr: 'Paramètres', de: 'Einstellungen', 'pt-BR': 'Configurações', it: 'Impostazioni', nl: 'Instellingen', pl: 'Ustawienia', ru: 'Настройки', tr: 'Ayarlar', ja: '設定', zh: '设置', hi: 'सेटिंग्स', uk: 'Налаштування' },
    'Save': { es: 'Guardar', fr: 'Enregistrer', de: 'Speichern', 'pt-BR': 'Salvar', it: 'Salva', nl: 'Opslaan', pl: 'Zapisz', ru: 'Сохранить', tr: 'Kaydet', ja: '保存', zh: '保存', hi: 'सहेजें', uk: 'Зберегти' },
    'Send': { es: 'Enviar', fr: 'Envoyer', de: 'Senden', 'pt-BR': 'Enviar', it: 'Invia', nl: 'Verzenden', pl: 'Wyślij', ru: 'Отправить', tr: 'Gönder', ja: '送信', zh: '发送', hi: 'भेजें', uk: 'Надіслати' },
    'Submit': { es: 'Enviar', fr: 'Envoyer', de: 'Senden', 'pt-BR': 'Enviar', it: 'Invia', nl: 'Verzenden', pl: 'Wyślij', ru: 'Отправить', tr: 'Gönder', ja: '送信', zh: '提交', hi: 'सबमिट करें', uk: 'Надіслати' },
    'Download': { es: 'Descargar', fr: 'Télécharger', de: 'Herunterladen', 'pt-BR': 'Baixar', it: 'Scarica', nl: 'Downloaden', pl: 'Pobierz', ru: 'Скачать', tr: 'İndir', ja: 'ダウンロード', zh: '下载', hi: 'डाउनलोड', uk: 'Завантажити' },
    'Join': { es: 'Unirse', fr: 'Rejoindre', de: 'Beitreten', 'pt-BR': 'Entrar', it: 'Entra', nl: 'Deelnemen', pl: 'Dołącz', ru: 'Войти', tr: 'Katıl', ja: '参加', zh: '加入', hi: 'शामिल हों', uk: 'Приєднатися' },
    'Create': { es: 'Crear', fr: 'Créer', de: 'Erstellen', 'pt-BR': 'Criar', it: 'Crea', nl: 'Aanmaken', pl: 'Utwórz', ru: 'Создать', tr: 'Oluştur', ja: '作成', zh: '创建', hi: 'बनाएँ', uk: 'Створити' },
    'Tools': { es: 'Herramientas', fr: 'Outils', de: 'Werkzeuge', 'pt-BR': 'Ferramentas', it: 'Strumenti', nl: 'Gereedschap', pl: 'Narzędzia', ru: 'Инструменты', tr: 'Araçlar', ja: 'ツール', zh: '工具', hi: 'औज़ार', uk: 'Інструменти' },
    'Palette': { es: 'Paleta', fr: 'Palette', de: 'Palette', 'pt-BR': 'Paleta', it: 'Tavolozza', nl: 'Palet', pl: 'Paleta', ru: 'Палитра', tr: 'Palet', ja: 'パレット', zh: '调色板', hi: 'पैलेट', uk: 'Палітра' },
    'Layers': { es: 'Capas', fr: 'Calques', de: 'Ebenen', 'pt-BR': 'Camadas', it: 'Livelli', nl: 'Lagen', pl: 'Warstwy', ru: 'Слои', tr: 'Katmanlar', ja: 'レイヤー', zh: '图层', hi: 'परतें', uk: 'Шари' },
    'Fill': { es: 'Rellenar', fr: 'Remplir', de: 'Füllen', 'pt-BR': 'Preencher', it: 'Riempi', nl: 'Vullen', pl: 'Wypełnij', ru: 'Заливка', tr: 'Doldur', ja: '塗りつぶし', zh: '填充', hi: 'भरें', uk: 'Заливка' },
    'Eraser': { es: 'Goma', fr: 'Gomme', de: 'Radierer', 'pt-BR': 'Borracha', it: 'Gomma', nl: 'Gum', pl: 'Gumka', ru: 'Ластик', tr: 'Silgi', ja: '消しゴム', zh: '橡皮擦', hi: 'इरेज़र', uk: 'Гумка' },
    'Rect': { es: 'Rectángulo', fr: 'Rectangle', de: 'Rechteck', 'pt-BR': 'Retângulo', it: 'Rettangolo', nl: 'Rechthoek', pl: 'Prostokąt', ru: 'Прямоугольник', tr: 'Dikdörtgen', ja: '四角形', zh: '矩形', hi: 'आयत', uk: 'Прямокутник' },
    'Circle': { es: 'Círculo', fr: 'Cercle', de: 'Kreis', 'pt-BR': 'Círculo', it: 'Cerchio', nl: 'Cirkel', pl: 'Okrąg', ru: 'Круг', tr: 'Daire', ja: '円', zh: '圆形', hi: 'वृत्त', uk: 'Коло' },
    'Triangle': { es: 'Triángulo', fr: 'Triangle', de: 'Dreieck', 'pt-BR': 'Triângulo', it: 'Triangolo', nl: 'Driehoek', pl: 'Trójkąt', ru: 'Треугольник', tr: 'Üçgen', ja: '三角形', zh: '三角形', hi: 'त्रिभुज', uk: 'Трикутник' },
    'Line': { es: 'Línea', fr: 'Ligne', de: 'Linie', 'pt-BR': 'Linha', it: 'Linea', nl: 'Lijn', pl: 'Linia', ru: 'Линия', tr: 'Çizgi', ja: '線', zh: '线条', hi: 'रेखा', uk: 'Лінія' },
    'Pencil': { es: 'Lápiz', fr: 'Crayon', de: 'Stift', 'pt-BR': 'Lápis', it: 'Matita', nl: 'Potlood', pl: 'Ołówek', ru: 'Карандаш', tr: 'Kalem', ja: '鉛筆', zh: '铅笔', hi: 'पेंसिल', uk: 'Олівець' },
    'Pick': { es: 'Cuentagotas', fr: 'Pipette', de: 'Pipette', 'pt-BR': 'Conta-gotas', it: 'Contagocce', nl: 'Pipet', pl: 'Kroplomierz', ru: 'Пипетка', tr: 'Damlalık', ja: 'スポイト', zh: '取色', hi: 'पिपेट', uk: 'Піпетка' },
    'Recent': { es: 'Recientes', fr: 'Récents', de: 'Zuletzt', 'pt-BR': 'Recentes', it: 'Recenti', nl: 'Recent', pl: 'Ostatnie', ru: 'Недавние', tr: 'Son', ja: '最近', zh: '最近', hi: 'हाल के', uk: 'Нещодавні' },
    'Shortcuts': { es: 'Atajos', fr: 'Raccourcis', de: 'Tastenkürzel', 'pt-BR': 'Atalhos', it: 'Scorciatoie', nl: 'Sneltoetsen', pl: 'Skróty', ru: 'Горячие клавиши', tr: 'Kısayollar', ja: 'ショートカット', zh: '快捷键', hi: 'शॉर्टकट', uk: 'Гарячі клавіші' },
    'New Canvas': { es: 'Nuevo lienzo', fr: 'Nouveau canevas', de: 'Neue Leinwand', 'pt-BR': 'Nova tela', it: 'Nuova tela', nl: 'Nieuw canvas', pl: 'Nowe płótno', ru: 'Новый холст', tr: 'Yeni tuval', ja: '新規キャンバス', zh: '新建画布', hi: 'नया कैनवास', uk: 'Нове полотно' },
    'Save PNG': { es: 'Guardar PNG', fr: 'Enregistrer PNG', de: 'PNG speichern', 'pt-BR': 'Salvar PNG', it: 'Salva PNG', nl: 'PNG opslaan', pl: 'Zapisz PNG', ru: 'Сохранить PNG', tr: 'PNG kaydet', ja: 'PNGを保存', zh: '保存 PNG', hi: 'PNG सहेजें', uk: 'Зберегти PNG' },
    'My Gallery': { es: 'Mi galería', fr: 'Ma galerie', de: 'Meine Galerie', 'pt-BR': 'Minha galeria', it: 'La mia galleria', nl: 'Mijn galerij', pl: 'Moja galeria', ru: 'Моя галерея', tr: 'Galerim', ja: 'マイギャラリー', zh: '我的画廊', hi: 'मेरी गैलरी', uk: 'Моя галерея' },
    'Gallery': { es: 'Galería', fr: 'Galerie', de: 'Galerie', 'pt-BR': 'Galeria', it: 'Galleria', nl: 'Galerij', pl: 'Galeria', ru: 'Галерея', tr: 'Galeri', ja: 'ギャラリー', zh: '画廊', hi: 'गैलरी', uk: 'Галерея' },
    'Untitled': { es: 'Sin título', fr: 'Sans titre', de: 'Ohne Titel', 'pt-BR': 'Sem título', it: 'Senza titolo', nl: 'Naamloos', pl: 'Bez tytułu', ru: 'Без названия', tr: 'Adsız', ja: '無題', zh: '无标题', hi: 'बिना शीर्षक', uk: 'Без назви' },
    'Title': { es: 'Título', fr: 'Titre', de: 'Titel', 'pt-BR': 'Título', it: 'Titolo', nl: 'Titel', pl: 'Tytuł', ru: 'Заголовок', tr: 'Başlık', ja: 'タイトル', zh: '标题', hi: 'शीर्षक', uk: 'Заголовок' },
    'Queue': { es: 'Cola', fr: "File d'attente", de: 'Warteschlange', 'pt-BR': 'Fila', it: 'Coda', nl: 'Wachtrij', pl: 'Kolejka', ru: 'Очередь', tr: 'Sıra', ja: 'キュー', zh: '队列', hi: 'कतार', uk: 'Черга' },
    'Queue is empty': { es: 'La cola está vacía', fr: "La file d'attente est vide", de: 'Warteschlange ist leer', 'pt-BR': 'A fila está vazia', it: 'La coda è vuota', nl: 'Wachtrij is leeg', pl: 'Kolejka jest pusta', ru: 'Очередь пуста', tr: 'Sıra boş', ja: 'キューは空です', zh: '队列为空', hi: 'कतार खाली है', uk: 'Черга порожня' },
    'Nothing playing': { es: 'No se está reproduciendo nada', fr: 'Rien en lecture', de: 'Nichts läuft', 'pt-BR': 'Nada tocando', it: 'Niente in riproduzione', nl: 'Niets speelt', pl: 'Nic nie gra', ru: 'Ничего не играет', tr: 'Çalan yok', ja: '再生中ではありません', zh: '未在播放', hi: 'कुछ नहीं चल रहा', uk: 'Нічого не грає' },
    'Liked Songs': { es: 'Canciones que te gustan', fr: 'Titres likés', de: 'Lieblingssongs', 'pt-BR': 'Músicas curtidas', it: 'Brani piaciuti', nl: 'Gelikete nummers', pl: 'Ulubione utwory', ru: 'Понравившиеся песни', tr: 'Beğenilenler', ja: 'お気に入り', zh: '喜欢的歌曲', hi: 'पसंदीदा गाने', uk: 'Уподобані пісні' },
    'Trending Music': { es: 'Música en tendencia', fr: 'Musique tendance', de: 'Angesagte Musik', 'pt-BR': 'Música em alta', it: 'Musica di tendenza', nl: 'Trending muziek', pl: 'Popularna muzyka', ru: 'В тренде', tr: 'Trend müzik', ja: 'トレンド', zh: '热门音乐', hi: 'ट्रेंडिंग संगीत', uk: 'Популярна музика' },
    'Channel': { es: 'Canal', fr: 'Salon', de: 'Kanal', 'pt-BR': 'Canal', it: 'Canale', nl: 'Kanaal', pl: 'Kanał', ru: 'Канал', tr: 'Kanal', ja: 'チャンネル', zh: '频道', hi: 'चैनल', uk: 'Канал' },
    'Not connected': { es: 'Sin conexión', fr: 'Non connecté', de: 'Nicht verbunden', 'pt-BR': 'Não conectado', it: 'Non connesso', nl: 'Niet verbonden', pl: 'Brak połączenia', ru: 'Не подключено', tr: 'Bağlı değil', ja: '未接続', zh: '未连接', hi: 'कनेक्ट नहीं है', uk: 'Не підключено' },
    'You': { es: 'Tú', fr: 'Vous', de: 'Du', 'pt-BR': 'Você', it: 'Tu', nl: 'Jij', pl: 'Ty', ru: 'Вы', tr: 'Sen', ja: 'あなた', zh: '你', hi: 'आप', uk: 'Ви' },
    'Copy': { es: 'Copiar', fr: 'Copier', de: 'Kopieren', 'pt-BR': 'Copiar', it: 'Copia', nl: 'Kopiëren', pl: 'Kopiuj', ru: 'Копировать', tr: 'Kopyala', ja: 'コピー', zh: '复制', hi: 'कॉपी करें', uk: 'Копіювати' },
    'Connect': { es: 'Conectar', fr: 'Connecter', de: 'Verbinden', 'pt-BR': 'Conectar', it: 'Connetti', nl: 'Verbinden', pl: 'Połącz', ru: 'Подключить', tr: 'Bağlan', ja: '接続', zh: '连接', hi: 'कनेक्ट करें', uk: 'Підключити' },
    'Global Chat': { es: 'Chat global', fr: 'Chat global', de: 'Globaler Chat', 'pt-BR': 'Chat global', it: 'Chat globale', nl: 'Algemene chat', pl: 'Czat globalny', ru: 'Общий чат', tr: 'Genel sohbet', ja: 'グローバルチャット', zh: '全球聊天', hi: 'ग्लोबल चैट', uk: 'Глобальний чат' },
    'Direct Message': { es: 'Mensaje directo', fr: 'Message privé', de: 'Direktnachricht', 'pt-BR': 'Mensagem direta', it: 'Messaggio diretto', nl: 'Privébericht', pl: 'Wiadomość prywatna', ru: 'Личное сообщение', tr: 'Özel mesaj', ja: 'ダイレクトメッセージ', zh: '私信', hi: 'सीधा संदेश', uk: 'Особисте повідомлення' },
    'Username': { es: 'Usuario', fr: 'Nom du compte', de: 'Benutzername', 'pt-BR': 'Nome de usuário', it: 'Nome utente', nl: 'Gebruikersnaam', pl: 'Nazwa użytkownika', ru: 'Имя пользователя', tr: 'Kullanıcı adı', ja: 'ユーザー名', zh: '用户名', hi: 'उपयोगकर्ता नाम', uk: "Ім'я користувача" },
    'Password': { es: 'Contraseña', fr: 'Mot de passe', de: 'Passwort', 'pt-BR': 'Senha', it: 'Password', nl: 'Wachtwoord', pl: 'Hasło', ru: 'Пароль', tr: 'Şifre', ja: 'パスワード', zh: '密码', hi: 'पासवर्ड', uk: 'Пароль' },
    'Background image': { es: 'Imagen de fondo', fr: 'Image de fond', de: 'Hintergrundbild', 'pt-BR': 'Imagem de fundo', it: 'Immagine di sfondo', nl: 'Achtergrondafbeelding', pl: 'Obraz tła', ru: 'Фоновое изображение', tr: 'Arka plan görseli', ja: '背景画像', zh: '背景图片', hi: 'बैकग्राउंड छवि', uk: 'Фонове зображення' },
    'Terminal': { es: 'Terminal', fr: 'Terminal', de: 'Terminal', 'pt-BR': 'Terminal', it: 'Terminale', nl: 'Terminal', pl: 'Terminal', ru: 'Терминал', tr: 'Terminal', ja: 'ターミナル', zh: '终端', hi: 'टर्मिनल', uk: 'Термінал' },
    'Reset': { es: 'Restablecer', fr: 'Réinitialiser', de: 'Zurücksetzen', 'pt-BR': 'Redefinir', it: 'Reimposta', nl: 'Herstellen', pl: 'Resetuj', ru: 'Сброс', tr: 'Sıfırla', ja: 'リセット', zh: '重置', hi: 'रीसेट', uk: 'Скинути' },
    'Games': { es: 'Juegos', fr: 'Jeux', de: 'Spiele', 'pt-BR': 'Jogos', it: 'Giochi', nl: 'Spellen', pl: 'Gry', ru: 'Игры', tr: 'Oyunlar', ja: 'ゲーム', zh: '游戏', hi: 'गेम्स', uk: 'Ігри' },
    'Movies': { es: 'Películas', fr: 'Films', de: 'Filme', 'pt-BR': 'Filmes', it: 'Film', nl: 'Films', pl: 'Filmy', ru: 'Фильмы', tr: 'Filmler', ja: '映画', zh: '电影', hi: 'फ़िल्में', uk: 'Фільми' },
    'No results found': { es: 'Sin resultados', fr: 'Aucun résultat', de: 'Keine Ergebnisse', 'pt-BR': 'Nenhum resultado', it: 'Nessun risultato', nl: 'Geen resultaten', pl: 'Brak wyników', ru: 'Ничего не найдено', tr: 'Sonuç yok', ja: '結果がありません', zh: '未找到结果', hi: 'कोई परिणाम नहीं', uk: 'Нічого не знайдено' },
    'Send file': { es: 'Enviar archivo', fr: 'Envoyer un fichier', de: 'Datei senden', 'pt-BR': 'Enviar arquivo', it: 'Invia file', nl: 'Bestand versturen', pl: 'Wyślij plik', ru: 'Отправить файл', tr: 'Dosya gönder', ja: 'ファイルを送信', zh: '发送文件', hi: 'फ़ाइल भेजें', uk: 'Надіслати файл' },
    'Friends': { es: 'Amigos', fr: 'Amis', de: 'Freunde', 'pt-BR': 'Amigos', it: 'Amici', nl: 'Vrienden', pl: 'Znajomi', ru: 'Друзья', tr: 'Arkadaşlar', ja: 'フレンド', zh: '好友', hi: 'मित्र', uk: 'Друзі' },
    'Online': { es: 'En línea', fr: 'En ligne', de: 'Online', 'pt-BR': 'Online', it: 'Online', nl: 'Online', pl: 'Dostępny', ru: 'В сети', tr: 'Çevrimiçi', ja: 'オンライン', zh: '在线', hi: 'ऑनलाइन', uk: 'У мережі' },
    'Offline': { es: 'Desconectado', fr: 'Hors ligne', de: 'Offline', 'pt-BR': 'Offline', it: 'Offline', nl: 'Offline', pl: 'Niedostępny', ru: 'Не в сети', tr: 'Çevrimdışı', ja: 'オフライン', zh: '离线', hi: 'ऑफ़लाइन', uk: 'Не в мережі' },
    'Log out': { es: 'Cerrar sesión', fr: 'Se déconnecter', de: 'Abmelden', 'pt-BR': 'Sair', it: 'Esci', nl: 'Uitloggen', pl: 'Wyloguj', ru: 'Выйти', tr: 'Çıkış yap', ja: 'ログアウト', zh: '退出登录', hi: 'लॉग आउट', uk: 'Вийти' },
    'Language': { es: 'Idioma', fr: 'Langue', de: 'Sprache', 'pt-BR': 'Idioma', it: 'Lingua', nl: 'Taal', pl: 'Język', ru: 'Язык', tr: 'Dil', ja: '言語', zh: '语言', hi: 'भाषा', uk: 'Мова' }
  };

  var source = new WeakMap(); // text node -> original English text

  function lang() {
    try { return localStorage.getItem('apricity-language') || 'en'; } catch (e) { return 'en'; }
  }

  function entryFor(english) {
    return Object.prototype.hasOwnProperty.call(PHRASES, english) ? PHRASES[english] : null;
  }

  function translateNode(node) {
    var raw = node.nodeValue;
    if (!raw) return;
    var key = source.has(node) ? source.get(node) : raw.trim();
    if (!key) return;
    var entry = entryFor(key);
    if (!entry) return;
    if (!source.has(node)) source.set(node, key);
    var out = entry[lang()] || key;
    var lead = raw.match(/^\s*/)[0];
    var trail = raw.match(/\s*$/)[0];
    var next = lead + out + trail;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttributes(root) {
    var nodes = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title]') : [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      ['placeholder', 'title'].forEach(function (attr) {
        if (!el.hasAttribute(attr)) return;
        var cacheKey = '__i18n_' + attr;
        var src = el[cacheKey] !== undefined ? el[cacheKey] : el.getAttribute(attr);
        if (!src) return;
        var entry = entryFor(src.trim());
        if (!entry) return;
        el[cacheKey] = src;
        el.setAttribute(attr, entry[lang()] || src.trim());
      });
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateNode(root); return; }
    if (root.nodeType !== 1) return;
    var tag = root.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') return;
    translateAttributes(root);
    if (root.firstChild) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      var node;
      while ((node = walker.nextNode())) translateNode(node);
    }
  }

  function apply() {
    document.documentElement.lang = lang();
    walk(document.body || document.documentElement);
    var title = document.title;
    var entry = title ? entryFor(title.trim()) : null;
    if (entry) document.title = entry[lang()] || title;
  }

  // Text rendered after load (lists, modals, message rows) gets picked up here.
  var pending = null;
  function schedule(nodes) {
    if (!nodes || !nodes.length) return;
    if (pending) return;
    pending = requestAnimationFrame(function () {
      pending = null;
      nodes.forEach(function (n) { walk(n); });
    });
  }

  function startObserver() {
    if (!('MutationObserver' in window) || !document.body) return;
    var observer = new MutationObserver(function (muts) {
      var added = [];
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type !== 'childList') continue;
        for (var j = 0; j < m.addedNodes.length; j++) added.push(m.addedNodes[j]);
      }
      schedule(added);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.AppLanguage = {
    get code() { return lang(); },
    t: function (english) { var e = entryFor(english); return e ? (e[lang()] || english) : english; },
    apply: apply,
    phrases: PHRASES
  };

  // A language change in the launcher fires a storage event in this iframe.
  window.addEventListener('storage', function (e) {
    if (e && e.key === 'apricity-language') apply();
  });
  window.addEventListener('message', function (e) {
    if (e && e.data && e.data.type === 'apricity-language') apply();
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) apply();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(); startObserver(); });
  } else {
    apply();
    startObserver();
  }
})();
