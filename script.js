"use strict";

const ROLES = ["MT", "ST", "PH", "BH", "D1", "D2", "D3", "D4"];
const STORAGE_KEY = "ffxiv-streamkit-generator-v1";
const DEFAULTS = {
  provider: "streamkit",
  roles: ROLES.map(role => ({ role, id: "", name: "", present: true })),
  avatarSize: 104, gap: 14, borderWidth: 3, borderColor: "#e5eeee",
  nameSize: 14, labelSize: 15, tankBg: "#315aa5", healerBg: "#298647", dpsBg: "#ac3032", radius: 0,
  showNames: true, effect: "glow", glowColor: "#72e2bf", glowStrength: 18,
  talkBorderWidth: 6, moveAmount: 4, speed: 0.7, scale: 1.04
};
const NUMERIC = {
  avatarSize: [48,160], gap: [0,48], borderWidth: [1,8],
  nameSize: [10,24], labelSize: [10,24], radius: [0,24],
  glowStrength: [4,40], talkBorderWidth: [2,12], moveAmount: [2,8],
  speed: [0.3,1.5], scale: [1.02,1.05]
};
const $ = id => document.getElementById(id);
const copy = value => JSON.parse(JSON.stringify(value));
let state = loadState();
const speaking = new Set();

function cleanState(raw) {
  const clean = copy(DEFAULTS);
  if (!raw || typeof raw !== "object") return clean;
  if (["streamkit", "reactive"].includes(raw.provider)) clean.provider = raw.provider;
  if (Array.isArray(raw.roles)) {
    ROLES.forEach((role, index) => {
      const found = raw.roles.find(item => item && item.role === role) || raw.roles[index];
      if (!found || typeof found !== "object") return;
      clean.roles[index].id = String(found.id ?? "").trim().slice(0, 20);
      clean.roles[index].name = String(found.name ?? "").slice(0, 40);
      clean.roles[index].present = found.present !== false;
    });
  }
  for (const [key, [min, max]] of Object.entries(NUMERIC)) {
    const value = Number(raw[key]);
    if (Number.isFinite(value)) clean[key] = Math.min(max, Math.max(min, value));
  }
  for (const key of ["borderColor", "tankBg", "healerBg", "dpsBg", "glowColor"]) {
    if (typeof raw[key] === "string" && /^#[\da-fA-F]{6}$/.test(raw[key])) clean[key] = raw[key];
  }
  clean.showNames = raw.showNames !== false;
  if (["glow", "glowThick", "bounce", "scale"].includes(raw.effect)) clean.effect = raw.effect;
  return clean;
}

function loadState() {
  try { return cleanState(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { return copy(DEFAULTS); }
}

function saveState(message = "") {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (message) setStatus("storage-status", message);
  } catch { setStatus("storage-status", "このブラウザでは保存できません。JSONをエクスポートしてください。"); }
}

function setStatus(id, message) {
  $(id).textContent = message;
}

function roleColor(role) {
  return role.startsWith("D") ? state.dpsBg : ["PH", "BH"].includes(role) ? state.healerBg : state.tankBg;
}

function createRoleCards() {
  const grid = $("role-grid");
  grid.replaceChildren();
  state.roles.forEach((member, index) => {
    const card = document.createElement("div");
    card.className = "role-card";
    card.innerHTML = `<div class="role-card-head"><span class="role-pill">${member.role}</span><span class="role-index">SLOT ${String(index + 1).padStart(2,"0")}</span></div><label>DiscordユーザーID<input type="text" inputmode="numeric" autocomplete="off" maxlength="20" placeholder="17～20桁の数字" data-index="${index}" data-role-field="id"></label><label>表示確認用の名前<input type="text" maxlength="40" placeholder="プレビュー用" data-index="${index}" data-role-field="name"></label><label class="presence"><input type="checkbox" data-index="${index}" data-role-field="present"><span>プレビューで表示</span></label>`;
    card.querySelector(".role-pill").style.backgroundColor = roleColor(member.role);
    card.querySelector('[data-role-field="id"]').value = member.id;
    card.querySelector('[data-role-field="name"]').value = member.name;
    card.querySelector('[data-role-field="present"]').checked = member.present;
    grid.append(card);
  });
}

function effectControls() {
  const definitions = {
    glow: [["glowColor","発光色","color"],["glowStrength","発光強度","range",4,40,1,"px"]],
    glowThick: [["glowColor","発光色","color"],["glowStrength","発光強度","range",4,40,1,"px"],["talkBorderWidth","発話時の枠幅","range",2,12,1,"px"]],
    bounce: [["moveAmount","移動量","range",2,8,1,"px"],["speed","速度","range",0.3,1.5,0.1,"秒"]],
    scale: [["scale","倍率","range",1.02,1.05,0.01,"倍"],["speed","速度","range",0.3,1.5,0.1,"秒"]]
  };
  const host = $("effect-controls");
  host.replaceChildren();
  definitions[state.effect].forEach(([key,label,type,min,max,step,unit]) => {
    const wrapper = document.createElement("label");
    wrapper.className = "field";
    const caption = document.createElement("span");
    caption.textContent = label;
    if (type === "range") {
      const output = document.createElement("output");
      output.id = `${key}-value`;
      output.textContent = `${state[key]}${unit}`;
      caption.append(output);
    }
    const input = document.createElement("input");
    input.id = key;
    input.dataset.setting = key;
    input.type = type;
    if (type === "range") Object.assign(input, {min, max, step});
    input.value = state[key];
    wrapper.append(caption,input);
    host.append(wrapper);
  });
}

function syncControls() {
  createRoleCards();
  effectControls();
  document.querySelectorAll("[data-setting]").forEach(input => {
    const key = input.dataset.setting;
    if (input.type === "checkbox") input.checked = state[key];
    else input.value = state[key];
    const output = $(`${key}-value`);
    if (output) output.textContent = `${state[key]}${key === "scale" ? "倍" : key === "speed" ? "秒" : "px"}`;
  });
}

function validate() {
  const seen = new Set();
  const errors = [];
  state.roles.forEach((member,index) => {
    const input = document.querySelector(`[data-role-field="id"][data-index="${index}"]`);
    const invalid = member.id !== "" && !/^\d{17,20}$/.test(member.id);
    const duplicate = member.id !== "" && seen.has(member.id);
    if (member.id) seen.add(member.id);
    input.classList.toggle("invalid", invalid || duplicate);
    input.setAttribute("aria-invalid", String(invalid || duplicate));
    if (invalid) errors.push(`${member.role}: IDは17～20桁の数字にしてください`);
    if (duplicate) errors.push(`${member.role}: IDが重複しています`);
  });
  const missing = state.roles.filter(member => !member.id).map(member => member.role);
  const configured = state.roles.length - missing.length;
  const canCopy = configured > 0 && errors.length === 0;
  const guidance = configured === 0 ? "まず1人分のDiscordユーザーIDを入力してください。" :
    missing.length ? `${configured}/8人を設定済み。未入力の位置は空欄です: ${missing.join(" / ")}` :
    "8人分のIDがそろいました。CSSをコピーできます。";
  $("validation").textContent = errors.length ? errors.join(" ・ ") : guidance;
  $("validation").classList.toggle("valid", canCopy);
  $("copy-btn").disabled = !canCopy;
  return canCopy;
}

function renderPreview() {
  const host = $("preview");
  host.replaceChildren();
  host.dataset.effect = state.effect;
  host.style.setProperty("--preview-size", `${state.avatarSize}px`);
  host.style.setProperty("--preview-gap", `${state.gap}px`);
  host.style.setProperty("--preview-border", `${state.borderWidth}px`);
  host.style.setProperty("--preview-border-color", state.borderColor);
  host.style.setProperty("--preview-name-size", `${state.nameSize}px`);
  host.style.setProperty("--preview-label-size", `${state.labelSize}px`);
  host.style.setProperty("--preview-radius", `${state.radius}px`);
  host.style.setProperty("--preview-glow", `${state.glowStrength}px`);
  host.style.setProperty("--preview-glow-color", state.glowColor);
  host.style.setProperty("--preview-talk-border", `${state.talkBorderWidth}px`);
  host.style.setProperty("--preview-move", `${state.moveAmount}px`);
  host.style.setProperty("--preview-speed", `${state.speed}s`);
  host.style.setProperty("--preview-scale", state.scale);
  const members = [...state.roles, {role:"",name:"Guest 1",present:true}, {role:"",name:"Guest 2",present:true}, {role:"",name:"Guest 3",present:true}];
  members.forEach((member,index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preview-member";
    button.dataset.index = index;
    button.setAttribute("aria-label", `${member.role || member.name}の発話状態を切り替え`);
    button.setAttribute("aria-pressed", String(speaking.has(index)));
    if (member.present === false) button.classList.add("absent");
    if (speaking.has(index)) button.classList.add("speaking");
    const avatar = document.createElement("span");
    avatar.className = "preview-avatar";
    if (member.role) {
      const badge = document.createElement("span");
      badge.className = "preview-role";
      badge.textContent = member.role;
      badge.style.backgroundColor = roleColor(member.role);
      avatar.append(badge);
    }
    button.append(avatar);
    if (state.showNames) {
      const name = document.createElement("span");
      name.className = "preview-name";
      name.textContent = member.name || member.role || "Guest";
      button.append(name);
    }
    host.append(button);
  });
}

function generateStreamkitCSS() {
  const s = state;
  const step = s.avatarSize + s.gap;
  const roleRules = s.roles.filter(member => /^\d{17,20}$/.test(member.id)).map(member => {
    const index = ROLES.indexOf(member.role);
    return `/* ${member.role} */\nli.voice_state[data-userid="${member.id}"] {\n  position: absolute !important;\n  left: ${index * step}px !important;\n  top: 0 !important;\n}\nli.voice_state[data-userid="${member.id}"]::before {\n  content: "${member.role}";\n  position: absolute; z-index: 2; top: -4px; left: -4px;\n  padding: 0 5px; min-width: 28px; text-align: center;\n  color: #fff; background: ${roleColor(member.role)};\n  font-size: ${s.labelSize}px; font-weight: 800; line-height: 1.25;\n}\n`;
  }).join("\n");
  const effect = {
    glow: `li.voice_state.wrapper_speaking > img.voice_avatar {\n  box-shadow: 0 0 ${s.glowStrength}px ${s.glowColor} !important;\n}`,
    glowThick: `li.voice_state.wrapper_speaking > img.voice_avatar {\n  border-width: ${s.talkBorderWidth}px !important;\n  box-shadow: 0 0 ${s.glowStrength}px ${s.glowColor} !important;\n}`,
    bounce: `li.voice_state.wrapper_speaking {\n  animation: ffxiv-bounce ${s.speed}s ease-in-out infinite;\n}\n@keyframes ffxiv-bounce {\n  0%,100% { transform: translateY(0); }\n  50% { transform: translateY(-${s.moveAmount}px); }\n}`,
    scale: `li.voice_state.wrapper_speaking {\n  animation: ffxiv-scale ${s.speed}s ease-in-out infinite alternate;\n}\n@keyframes ffxiv-scale {\n  from { transform: scale(1); }\n  to { transform: scale(${s.scale}); }\n}`
  }[s.effect];
  return `/* FFXIV Discord StreamKit Overlay — OBS Custom CSS
   Voice Widget: names visible / limit_speaking=false
   Slots: MT ST PH BH D1 D2 D3 D4 | guests follow on the right
   Based on StreamKit's stable classes: voice_states, voice_state,
   voice_avatar, voice_username and wrapper_speaking. */
html, body { margin: 0 !important; background: transparent !important; overflow: hidden; }
.voice_container { width: max-content !important; max-width: none !important; background: transparent !important; overflow: visible !important; }
ul.voice_states {
  position: relative !important;
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: flex-start !important;
  gap: ${s.gap}px !important;
  width: max-content !important;
  min-height: ${s.avatarSize + s.nameSize + 18}px !important;
  margin: 4px 0 0 4px !important;
  padding: 0 0 0 ${8 * step}px !important;
  list-style: none !important;
  overflow: visible !important;
}
li.voice_state {
  position: relative;
  flex: 0 0 ${s.avatarSize}px !important;
  box-sizing: border-box !important;
  width: ${s.avatarSize}px !important;
  height: ${s.avatarSize + s.nameSize + 18}px !important;
  margin: 0 !important;
  padding: 0 !important;
  opacity: 1 !important;
  background: transparent !important;
  overflow: visible !important;
  transform-origin: center ${Math.round(s.avatarSize / 2)}px;
}
li.voice_state > img.voice_avatar {
  display: block !important;
  float: none !important;
  box-sizing: border-box !important;
  width: ${s.avatarSize}px !important;
  height: ${s.avatarSize}px !important;
  margin: 0 !important;
  border: ${s.borderWidth}px solid ${s.borderColor} !important;
  border-radius: ${s.radius}px !important;
  object-fit: cover !important;
  box-shadow: none !important;
}
.voice_username {
  display: ${s.showNames ? "block" : "none"} !important;
  position: absolute !important;
  z-index: 1;
  top: ${s.avatarSize + 5}px !important;
  left: 0 !important;
  box-sizing: border-box !important;
  width: ${s.avatarSize}px !important;
  height: ${s.nameSize + 9}px !important;
  padding: 2px 4px !important;
  border: 1px solid ${s.borderColor} !important;
  background: rgba(0,0,0,.82) !important;
  color: #fff !important;
  font-size: ${s.nameSize}px !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  overflow: hidden !important;
  white-space: nowrap !important;
}
.voice_username span {
  display: ${s.showNames ? "inline-block" : "none"} !important;
  max-width: 100%;
  padding: 0 !important;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff !important;
  background: transparent !important;
  border-radius: 0 !important;
  font-size: ${s.nameSize}px !important;
  font-weight: 700;
  text-shadow: 0 1px 2px #000;
}
${roleRules}
/* Speaking state is attached to each li by StreamKit. */
${effect}
`;
}

function generateReactiveCSS() {
  const s = state;
  const step = s.avatarSize + s.gap;
  const member = '#embed div[data-discord-id]';
  const canvas = `${member} > div.relative > canvas`;
  const roleRules = s.roles.filter(item => /^\d{17,20}$/.test(item.id)).map(item => {
    const index = ROLES.indexOf(item.role);
    const selector = `#embed div[data-discord-id="${item.id}"]`;
    return `/* ${item.role} */\n${selector} { position: absolute !important; left: ${index * step}px !important; top: 0 !important; }\n${selector}::before {\n  content: "${item.role}"; position: absolute; z-index: 50; top: -4px; left: -4px;\n  min-width: 28px; padding: 0 5px; text-align: center;\n  color: #fff; background: ${roleColor(item.role)};\n  font-size: ${s.labelSize}px; font-weight: 800; line-height: 1.25;\n}`;
  }).join("\n");
  const effect = {
    glow: `${member}[data-speaking="true"] > div.relative > canvas { box-shadow: 0 0 ${s.glowStrength}px ${s.glowColor} !important; }`,
    glowThick: `${member}[data-speaking="true"] > div.relative > canvas { border-width: ${s.talkBorderWidth}px !important; box-shadow: 0 0 ${s.glowStrength}px ${s.glowColor} !important; }`,
    bounce: `${member}[data-speaking="true"] { animation: ffxiv-bounce ${s.speed}s ease-in-out infinite !important; }\n@keyframes ffxiv-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-${s.moveAmount}px); } }`,
    scale: `${member}[data-speaking="true"] { animation: ffxiv-scale ${s.speed}s ease-in-out infinite alternate !important; }\n@keyframes ffxiv-scale { from { transform: scale(1); } to { transform: scale(${s.scale}); } }`
  }[s.effect];
  return `/* FFXIV Discord Reactive — OBS Custom CSS
   Use with the Reactive custom source URL and Show names enabled.
   Disable Only speaking so non-speaking members stay in the DOM.
   Selectors observed in Reactive's embed script: data-discord-id,
   data-speaking, canvas and the adjacent name element. */
html, body, #embed { margin: 0 !important; background: transparent !important; overflow: hidden !important; }
#embed .h-screen { justify-content: flex-start !important; align-items: flex-start !important; }
#embed .h-screen > div.flex {
  width: max-content !important; height: auto !important;
  max-width: none !important; max-height: none !important;
  aspect-ratio: auto !important; justify-content: flex-start !important;
  align-items: flex-start !important;
}
#embed .h-screen > div.flex > div.flex {
  position: relative !important; display: flex !important;
  flex-direction: row !important; flex-wrap: nowrap !important;
  align-items: flex-start !important; justify-content: flex-start !important;
  gap: ${s.gap}px !important; width: max-content !important;
  height: ${s.avatarSize + s.nameSize + 18}px !important;
  padding: 4px 0 0 ${8 * step + 4}px !important;
  aspect-ratio: auto !important; overflow: visible !important;
}
${member} {
  position: relative; display: block !important;
  flex: 0 0 ${s.avatarSize}px !important;
  width: ${s.avatarSize}px !important; height: ${s.avatarSize + s.nameSize + 18}px !important;
  max-width: none !important; max-height: none !important;
  aspect-ratio: auto !important; overflow: visible !important;
}
${member} > div.relative {
  position: relative !important; display: flex !important;
  flex-direction: column !important; align-items: stretch !important;
  justify-content: flex-start !important;
  width: ${s.avatarSize}px !important; height: auto !important;
  max-width: none !important; max-height: none !important;
  aspect-ratio: auto !important; overflow: visible !important;
}
${canvas} {
  display: block !important; box-sizing: border-box !important;
  flex: 0 0 ${s.avatarSize}px !important;
  width: ${s.avatarSize}px !important; height: ${s.avatarSize}px !important;
  max-width: none !important; max-height: none !important;
  border: ${s.borderWidth}px solid ${s.borderColor} !important;
  border-radius: ${s.radius}px !important; box-shadow: none !important;
}
${member} > div.relative > div.z-30 {
  display: ${s.showNames ? "block" : "none"} !important;
  position: static !important; inset: auto !important;
  flex: none !important; align-self: stretch !important;
  margin: 5px 0 0 !important;
  box-sizing: border-box !important; width: ${s.avatarSize}px !important;
  height: ${s.nameSize + 9}px !important; padding: 2px 4px !important;
  border: 1px solid ${s.borderColor} !important;
  background: rgba(0,0,0,.82) !important; color: #fff !important;
  font-size: ${s.nameSize}px !important; font-weight: 700 !important;
  line-height: 1.2 !important; text-align: left !important;
  -webkit-text-stroke-width: 0 !important;
  white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;
}
${roleRules}
${effect}
`;
}

function generateCSS() {
  return state.provider === "reactive" ? generateReactiveCSS() : generateStreamkitCSS();
}

function update() {
  document.querySelectorAll(".role-pill").forEach((pill,index) => { pill.style.backgroundColor = roleColor(ROLES[index]); });
  validate();
  renderPreview();
  const css = generateCSS();
  $("output-help").textContent = state.provider === "reactive" ?
    "OBSでDiscord ReactiveのCustom Source URLを設定したブラウザソースを開き、同じソースの「カスタムCSS」欄を生成CSSの全文で置き換えてください。Reactive側では名前を表示し、発話中の人だけを表示する設定をオフにします。" :
    "OBSでStreamKitのVoice Widget URLを設定したブラウザソースを開き、同じソースの「カスタムCSS」欄を生成CSSの全文で置き換えてください。適用後はソースのキャッシュを更新します。";
  $("css-output").value = css;
  $("css-lines").textContent = `${css.trim().split("\n").length} lines`;
  $("obs-width").textContent = `${11 * (state.avatarSize + state.gap) + 8}px`;
  saveState();
}

document.addEventListener("input", event => {
  const input = event.target;
  if (input.dataset.roleField) {
    const index = Number(input.dataset.index);
    const field = input.dataset.roleField;
    if (field === "present") state.roles[index].present = input.checked;
    else state.roles[index][field] = input.value;
    update();
  } else if (input.dataset.setting) {
    const key = input.dataset.setting;
    state[key] = input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value;
    if (key === "effect") effectControls();
    const output = $(`${key}-value`);
    if (output) output.textContent = `${state[key]}${key === "scale" ? "倍" : key === "speed" ? "秒" : "px"}`;
    update();
  }
});
document.addEventListener("change", event => {
  if (event.target.dataset.roleField === "present") {
    state.roles[Number(event.target.dataset.index)].present = event.target.checked;
    update();
  }
});
$("preview").addEventListener("click", event => {
  const button = event.target.closest("button.preview-member");
  if (!button || button.classList.contains("absent")) return;
  const index = Number(button.dataset.index);
  if (speaking.has(index)) speaking.delete(index); else speaking.add(index);
  renderPreview();
});
$("copy-btn").addEventListener("click", async () => {
  if (!validate()) return;
  const output = $("css-output");
  try {
    if (!navigator.clipboard?.writeText) throw new Error("clipboard-unavailable");
    await navigator.clipboard.writeText(output.value);
    setStatus("copy-status", "CSSをコピーしました");
  } catch {
    output.focus();
    output.select();
    const done = document.execCommand("copy");
    setStatus("copy-status", done ? "CSSをコピーしました" : "自動コピーできませんでした。選択されたCSSをCtrl+Cでコピーしてください。");
  }
});
$("save-btn").addEventListener("click", () => saveState("設定を保存しました"));
$("export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ffxiv-discord-overlay-settings.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus("storage-status", "設定JSONを保存しました");
});
$("import-file").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    if (!raw || !Array.isArray(raw.roles)) throw new Error("format");
    state = cleanState(raw);
    speaking.clear();
    syncControls();
    update();
    setStatus("storage-status", "設定JSONを読み込みました");
  } catch { setStatus("storage-status", "JSONを読み込めませんでした。形式を確認してください。"); }
  event.target.value = "";
});
$("reset-btn").addEventListener("click", () => {
  if (!confirm("入力した設定をすべて初期化しますか？")) return;
  state = copy(DEFAULTS);
  speaking.clear();
  syncControls();
  update();
  setStatus("storage-status", "設定を初期化しました");
});

syncControls();
update();
