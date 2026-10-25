import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// 🔗 นำ URL ที่ได้จากการ Deploy Google Apps Script (/exec) มาวางตรงนี้ค่ะ
// ============================================================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbyxF8L7G5D9rmZR7PVeR3B4yQbULzAzQG0Dfo1aCQdj-FWqueb5cnelpCnKuTBEk04dpw/exec";

const PREFIX_OPTIONS = ['นาย', 'นางสาว', 'นาง', 'ด.ช.', 'ด.ญ.'];

// ตั้งค่าตัวย่อ ชื่อเต็ม และสีป้ายให้ตรงกับ Google Sheets ของแขวง
const ROLE_DEFINITIONS = [
  { code: 'หน.เขต', label: 'หัวหน้าเขต', badgeCls: 'bg-sky-200 text-sky-950' },
  { code: 'หนว.', label: 'หัวหน้าแขวง', badgeCls: 'bg-sky-200 text-sky-950' },
  { code: 'หนข.', label: 'หัวหน้าแขวง/เขต', badgeCls: 'bg-sky-200 text-sky-950' },
  { code: 'หนน.', label: 'หัวหน้าหน่วย', badgeCls: 'bg-pink-400 text-white' },
  { code: 'หนซ.', label: 'หัวหน้าเซลล์', badgeCls: 'bg-rose-200 text-rose-950' },
  { code: 'รองหนซ.', label: 'รองหัวหน้าเซลล์', badgeCls: 'bg-red-700 text-white' },
  { code: 'พล.', label: 'พี่เลี้ยง', badgeCls: 'bg-amber-200 text-amber-950' },
  { code: 'สช.', label: 'สมาชิก', badgeCls: 'bg-green-200 text-green-950' },
  { code: 'ผช.', label: 'ผู้เชื่อ', badgeCls: 'bg-sky-200 text-sky-900' },
  { code: 'ผชม.', label: 'ผู้เชื่อใหม่', badgeCls: 'bg-purple-200 text-purple-950' },
  { code: 'ผจ.', label: 'ผู้สนใจ', badgeCls: 'bg-slate-200 text-slate-800' },
];

// กลุ่มสิทธิ์การเข้าถึงเมนูต่างๆ (เช็กแบบตรงตัว ไม่สับสนกับ ผช. ที่แปลว่าผู้เชื่อ)
const LEADER_ROLE_CODES = [
  'หน.เขต', 'หนว.', 'หนข.', 'หนน.', 'หนซ.', 'รองหนซ.', 'พล.',
  'หนข', 'หนว', 'หนน', 'หนซ', 'รองหนซ', 'พล',
  'หัวหน้าเขต', 'หัวหน้าแขวง', 'หัวหน้าหน่วย', 'หัวหน่วย', 'หัวหน้าเซลล์', 'รองหัวหน้าเซลล์', 'พี่เลี้ยง', 'admin'
];

const ADMIN_ROLE_CODES = [
  'หน.เขต', 'หนว.', 'หนข.', 'หนน.',
  'หนข', 'หนว', 'หนน',
  'หัวหน้าเขต', 'หัวหน้าแขวง', 'หัวหน้าหน่วย', 'หัวหน่วย', 'admin'
];

const WARD_WIDE_ROLE_CODES = [
  'หน.เขต', 'หนว.', 'หนข.', 'หนข', 'หนว',
  'หัวหน้าเขต', 'หัวหน้าแขวง', 'admin'
];

function getRoleInfo(roleCode) {
  const clean = String(roleCode || '').trim();
  const found = ROLE_DEFINITIONS.find(r => r.code === clean || r.code.replace('.', '') === clean);
  if (found) return found;
  return { code: clean || 'สช.', label: clean || 'สมาชิก', badgeCls: 'bg-slate-200 text-slate-800' };
}

function RoleBadge({ role, showFull = false }) {
  const info = getRoleInfo(role);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs ${info.badgeCls}`}>
      {showFull && info.code !== info.label ? `${info.code} (${info.label})` : info.code}
    </span>
  );
}

const CARD_THEMES = {
  blue: "from-sky-400 to-indigo-500 text-white",
  yellow: "from-amber-300 to-orange-400 text-slate-900",
  pink: "from-pink-400 to-rose-500 text-white",
  green: "from-emerald-400 to-teal-500 text-white",
  purple: "from-violet-400 to-purple-600 text-white",
};

const HBD_STICKERS = [
  { id: 'cake', emoji: '🎂', label: 'เค้กวันเกิด' },
  { id: 'party', emoji: '🎉', label: 'ปาร์ตี้' },
  { id: 'bless', emoji: '🙌', label: 'พระเจ้าอวยพร' },
  { id: 'heart', emoji: '💖', label: 'รักนะ' },
  { id: 'star', emoji: '🌟', label: 'เปล่งประกาย' },
];

const DAILY_QUOTES = [
  "“จงชื่นบานอยู่เสมอ จงอธิษฐานอย่างสม่ำเสมอ จงขอบพระคุณในทุกกรณี” (1 เธสะโลนิกา 5:16-18)",
  "“ข้าพเจ้าผจญทุกสิ่งได้ โดยพระองค์ผู้ทรงเสริมกำลังข้าพเจ้า” (ฟิลิปปี 4:13)",
  "“จงละความกังวลทั้งหมดของท่านไว้กับพระองค์ เพราะว่าพระองค์ทรงห่วงใยท่าน” (1 เปโตร 5:7)",
  "เหนื่อยไหมวันนี้? พักดื่มน้ำเย็นๆ สูดหายใจลึกๆ พระเจ้าอยู่ข้างๆ เสมอนะ ✌️✨",
  "ก้าวเล็กๆ ในแต่ละวัน ก็พาเราไปถึงเป้าหมายที่ยิ่งใหญ่ได้ เป็นกำลังใจให้นะ! 🌱"
];

const INITIAL_MOCK_DATA = {
  members: [
    { id: 'M001', prefix: 'นางสาว', nickname: 'พี่เพลง', fullname: 'จันทวรรณ ชมพู', birthdate: '1999-11-08', phone: '081-234-5678', role: 'หนน.', cell_group: 'BeTon', unit: 'BeOne', mentor_id: '', fav_food: 'ชาบู, กาแฟเย็น', prayer_request: 'ขอให้โปรเจกต์เว็บแขวงเสร็จราบรื่น', avatar_url: '', card_theme: 'blue', email: '', line_uid: '' },
    { id: 'M002', prefix: 'นาย', nickname: 'น้องต้นกล้า', fullname: 'ต้นกล้า ใจดี', birthdate: '2005-10-25', phone: '089-876-5432', role: 'ผชม.', cell_group: 'BeTon', unit: 'BeOne', mentor_id: 'M001', fav_food: 'หมูกระทะ', prayer_request: 'ขอให้อ่านหนังสือสอบทัน', avatar_url: '', card_theme: 'yellow', email: '', line_uid: '' },
  ],
  lessons: [
    { lesson_id: 'L01', book_name: 'บทเรียนติดตามผล 52 สัปดาห์', chapter_no: '1', title: 'ความรอดและความมั่นใจ', summary: 'พูดคุยเรื่องความหมายของการต้อนรับพระเยซู และความมั่นใจในความรอด', pdf_url: '/lesson52.pdf', mentor_tips: 'เน้นถามความรู้สึกของน้องหลังเชื่อ และชวนอ่าน ยอห์น 3:16 ด้วยกัน' },
  ],
  careLogs: [],
  hbdWishes: []
};

// จัดระเบียบข้อมูลสมาชิกและสร้าง ID อัตโนมัติหากในชีตยังว่างอยู่
function normalizeMembers(rawMembers = []) {
  let maxNum = 0;
  rawMembers.forEach(m => {
    const num = parseInt(String(m.id || '').replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  });

  return rawMembers
    .filter(m => m.nickname || m.fullname)
    .map(m => {
      const hasId = m.id && String(m.id).trim() !== '';
      const roleVal = m.role && String(m.role).trim() !== '' ? String(m.role).trim() : 'สช.';
      if (hasId) {
        return { ...m, id: String(m.id).trim(), role: roleVal };
      }
      maxNum += 1;
      return {
        ...m,
        id: 'M' + String(maxNum).padStart(3, '0'),
        role: roleVal,
        _missingSheetId: true,
      };
    });
}

// แสดงรูปโปรไฟล์จริงเท่านั้น หากยังไม่มีรูปจะขึ้นกรอบ "รออัปรูป"
function AvatarDisplay({ avatar, nickname = '', sizeClass = "w-12 h-12", roundedClass = "rounded-xl" }) {
  const isImage = avatar && (
    String(avatar).startsWith('data:image') ||
    String(avatar).startsWith('http') ||
    String(avatar).startsWith('/')
  );

  if (isImage) {
    return (
      <img
        src={avatar}
        alt={nickname || 'profile'}
        className={`${sizeClass} ${roundedClass} object-cover shadow-sm bg-white shrink-0 border border-white/60`}
      />
    );
  }

  return (
    <div className={`${sizeClass} ${roundedClass} bg-slate-200 text-slate-500 border border-dashed border-slate-400 flex flex-col items-center justify-center shrink-0 select-none p-1 text-center`}>
      <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span className="text-[9px] font-bold leading-tight mt-0.5">รออัปรูป</span>
    </div>
  );
}

// ย่อและครอปรูปโปรไฟล์เป็นสี่เหลี่ยมจัตุรัส
function resizeImageFile(file, maxSize = 200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length > 45000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.55);
        }
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [db, setDb] = useState(INITIAL_MOCK_DATA);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  // User & Auth States
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // ตัวเลือกเข้าสู่ระบบ หน่วย ➔ เซลล์ ➔ ชื่อ
  const [selUnit, setSelUnit] = useState('');
  const [selCell, setSelCell] = useState('');
  const [selMemberId, setSelMemberId] = useState('');

  // Profile & Directory States
  const [quote, setQuote] = useState(DAILY_QUOTES[0]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [cellFilter, setCellFilter] = useState('ALL');

  // Add Member Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    prefix: 'นางสาว', nickname: '', fullname: '', birthdate: '', phone: '',
    role: 'ผจ.', cell_group: '', unit: '', mentor_id: '',
    fav_food: '', prayer_request: '', avatar_url: '', card_theme: 'blue', email: '', line_uid: ''
  });

  // Birthday & HBD Card States
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedBirthdayPerson, setSelectedBirthdayPerson] = useState(null);
  const [wishMessage, setWishMessage] = useState('');
  const [wishSticker, setWishSticker] = useState('🎂');
  const [cardBg, setCardBg] = useState('from-pink-400 to-rose-500');
  const cardRef = useRef(null);
  const [downloadingCard, setDownloadingCard] = useState(false);

  // Care Tracker & Lesson States
  const [selectedSheepId, setSelectedSheepId] = useState('ALL');
  const [careCellFilter, setCareCellFilter] = useState('ALL');
  const [careForm, setCareForm] = useState({
    member_id: '',
    date: new Date().toISOString().split('T')[0],
    lesson_id: '',
    activities: [],
    note: '',
    prayer_point: ''
  });
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [newLessonForm, setNewLessonForm] = useState({
    book_name: 'บทเรียนติดตามผล 52 สัปดาห์', chapter_no: '', title: '', summary: '', pdf_url: '/lesson52.pdf', mentor_tips: ''
  });

  const isDemoMode = !GAS_URL || GAS_URL === "PUT_YOUR_GAS_WEB_APP_URL_HERE";

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!isDemoMode) {
      fetchAllData(true);
    } else {
      const savedId = localStorage.getItem('ward_saved_user_id');
      if (savedId) {
        const found = INITIAL_MOCK_DATA.members.find(m => m.id === savedId);
        if (found) {
          setCurrentUser(found);
          setIsLoggedIn(true);
        }
      }
    }
  }, []);

  const fetchAllData = async (checkSavedSession = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${GAS_URL}?action=getAll`);
      const json = await res.json();
      if (json.status === 'success') {
        const cleanMembers = normalizeMembers(json.data.members || []);
        const cleanData = {
          ...json.data,
          members: cleanMembers,
          lessons: json.data.lessons || [],
          careLogs: json.data.careLogs || [],
          hbdWishes: json.data.hbdWishes || [],
        };
        setDb(cleanData);

        const savedId = checkSavedSession ? localStorage.getItem('ward_saved_user_id') : currentUser?.id;
        const savedName = localStorage.getItem('ward_saved_user_fullname');
        if (savedId || savedName) {
          const found = cleanMembers.find(m => m.id === savedId) ||
                        (savedName ? cleanMembers.find(m => m.fullname === savedName) : null);
          if (found) {
            setCurrentUser(found);
            setIsLoggedIn(true);
          }
        }
      }
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถดึงข้อมูลจาก Google Sheets ได้ กรุณาเช็คอินเทอร์เน็ตหรือลิงก์ GAS', 'error');
    } finally {
      setLoading(false);
    }
  };

  const postToGAS = async (action, sheetName, data, keyColumn = 'id', silent = false) => {
    if (isDemoMode) {
      if (!silent) showToast('บันทึกสำเร็จ (โหมดยังไม่เชื่อมลิงก์ GAS)', 'info');
      return true;
    }
    if (!silent) setSyncing(true);
    try {
      const cleanPayload = { ...data };
      delete cleanPayload._missingSheetId;

      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, sheetName, data: cleanPayload, keyColumn })
      });
      const json = await res.json();
      if (json.status === 'success') {
        if (!silent) showToast(json.message || 'บันทึกลง Google Sheets เรียบร้อย! ✅');
        return true;
      } else {
        throw new Error(json.message);
      }
    } catch (err) {
      console.error(err);
      if (!silent) showToast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'error');
      return false;
    } finally {
      if (!silent) setSyncing(false);
    }
  };

  // เช็คสิทธิ์ พี่เลี้ยง & ผู้นำ (พล., รองหนซ., หนซ., หนน., หนว., หนข., หน.เขต)
  const isLeaderOrMentor = (user) => {
    if (!user) return false;
    const r = String(user.role || '').trim();
    return LEADER_ROLE_CODES.includes(r);
  };

  // เช็คสิทธิ์ระดับหัวหน้าหน่วยขึ้นไป (หนน., หนว., หนข., หน.เขต)
  const isAdminLeader = (user) => {
    if (!user) return false;
    const r = String(user.role || '').trim();
    return ADMIN_ROLE_CODES.includes(r);
  };

  // เช็คสิทธิ์ระดับหัวหน้าแขวง / เขต (เห็นข้ามหน่วยได้ทั้งหมด)
  const isWardWideLeader = (user) => {
    if (!user) return false;
    const r = String(user.role || '').trim();
    return WARD_WIDE_ROLE_CODES.includes(r);
  };

  const formatFullName = (member) => {
    if (!member) return '';
    const p = member.prefix ? String(member.prefix).trim() : '';
    const f = member.fullname ? String(member.fullname).trim() : '';
    if (p && f.startsWith(p)) return f;
    return `${p}${f}`.trim();
  };

  const generateNextMemberId = () => {
    const nums = db.members
      .map(m => parseInt(String(m.id).replace(/\D/g, ''), 10))
      .filter(n => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return 'M' + String(nextNum).padStart(3, '0');
  };

  const handleEditAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImageFile(file);
      setEditForm(prev => ({ ...prev, avatar_url: base64 }));
      showToast('เลือกรูปสำเร็จ กดปุ่มบันทึกด้านล่างเพื่อยืนยันนะคะ 📸');
    } catch (err) {
      showToast('ไม่สามารถอ่านไฟล์รูปภาพได้', 'error');
    }
  };

  const handleNewMemberAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImageFile(file);
      setNewMemberForm(prev => ({ ...prev, avatar_url: base64 }));
    } catch (err) {
      showToast('ไม่สามารถอ่านไฟล์รูปภาพได้', 'error');
    }
  };

  const handleSelectLogin = async (e) => {
    e.preventDefault();
    if (!selMemberId) {
      showToast('กรุณาเลือก หน่วย ➔ เซลล์ ➔ ชื่อของคุณให้ครบก่อนนะคะ', 'error');
      return;
    }
    const found = db.members.find(m => String(m.id) === String(selMemberId));
    if (!found) {
      showToast('ไม่พบข้อมูลสมาชิกในระบบ', 'error');
      return;
    }

    const activeMember = { ...found, _missingSheetId: false };
    localStorage.setItem('ward_saved_user_id', activeMember.id);
    if (activeMember.fullname) {
      localStorage.setItem('ward_saved_user_fullname', activeMember.fullname);
    }

    setCurrentUser(activeMember);
    setIsLoggedIn(true);
    setActiveTab('profile');
    showToast(`ยินดีต้อนรับ ${activeMember.nickname} (${getRoleInfo(activeMember.role).label}) 🎉`);

    if (found._missingSheetId) {
      const matchCol = found.fullname ? 'fullname' : 'nickname';
      setDb(prev => ({
        ...prev,
        members: prev.members.map(m => m.id === found.id ? activeMember : m)
      }));
      await postToGAS('update', 'Members', activeMember, matchCol, true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ward_saved_user_id');
    localStorage.removeItem('ward_saved_user_fullname');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setIsEditingProfile(false);
    setSelMemberId('');
    setActiveTab('profile');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const safeRole = isAdminLeader(currentUser) ? editForm.role : currentUser.role;
    const updatedUser = { ...currentUser, ...editForm, role: safeRole, _missingSheetId: false };

    setCurrentUser(updatedUser);
    if (updatedUser.fullname) {
      localStorage.setItem('ward_saved_user_fullname', updatedUser.fullname);
    }
    setDb(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === updatedUser.id ? updatedUser : m)
    }));
    setIsEditingProfile(false);

    const keyCol = currentUser._missingSheetId
      ? (currentUser.fullname ? 'fullname' : 'nickname')
      : 'id';
    await postToGAS('update', 'Members', updatedUser, keyCol);
  };

  const openAddMemberModal = () => {
    setNewMemberForm({
      prefix: 'นางสาว',
      nickname: '',
      fullname: '',
      birthdate: '',
      phone: '',
      role: isLoggedIn && isLeaderOrMentor(currentUser) ? 'ผจ.' : 'สช.',
      unit: currentUser?.unit || selUnit || availableUnits[0] || '',
      cell_group: currentUser?.cell_group || selCell || availableCellsInUnit[0] || '',
      mentor_id: currentUser?.id || '',
      fav_food: '',
      prayer_request: '',
      avatar_url: '',
      card_theme: 'blue',
      email: '',
      line_uid: ''
    });
    setShowAddMemberModal(true);
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!newMemberForm.avatar_url) {
      showToast('กรุณาอัปโหลดรูปโปรไฟล์ก่อนบันทึกนะคะ 📸', 'error');
      return;
    }

    const newId = generateNextMemberId();
    // ถ้าพี่เลี้ยงหรือผู้นำกดเพิ่ม สามารถเลือกเป็น สช./ผช./ผชม./ผจ. ได้ (ส่วนตำแหน่งผู้นำกำหนดได้เฉพาะระดับ หนน. ขึ้นไป)
    let assignedRole = 'สช.';
    if (isLoggedIn && isAdminLeader(currentUser)) {
      assignedRole = newMemberForm.role;
    } else if (isLoggedIn && isLeaderOrMentor(currentUser)) {
      assignedRole = ['สช.', 'ผช.', 'ผชม.', 'ผจ.'].includes(newMemberForm.role) ? newMemberForm.role : 'ผจ.';
    }

    const memberObj = {
      id: newId,
      ...newMemberForm,
      role: assignedRole,
    };

    setDb(prev => ({ ...prev, members: [...prev.members, memberObj] }));
    setShowAddMemberModal(false);

    if (!isLoggedIn) {
      localStorage.setItem('ward_saved_user_id', memberObj.id);
      if (memberObj.fullname) localStorage.setItem('ward_saved_user_fullname', memberObj.fullname);
      setCurrentUser(memberObj);
      setIsLoggedIn(true);
    }

    await postToGAS('insert', 'Members', memberObj);
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    const nextNum = db.lessons.length + 1;
    const lessonObj = {
      lesson_id: 'L' + String(nextNum).padStart(2, '0') + '_' + Date.now().toString().slice(-3),
      ...newLessonForm
    };
    setDb(prev => ({ ...prev, lessons: [...prev.lessons, lessonObj] }));
    setShowAddLessonModal(false);
    setNewLessonForm({
      book_name: 'บทเรียนติดตามผล 52 สัปดาห์', chapter_no: '', title: '', summary: '', pdf_url: '/lesson52.pdf', mentor_tips: ''
    });
    await postToGAS('insert', 'Lessons', lessonObj);
  };

  const handleSendWish = async (e) => {
    e.preventDefault();
    if (!selectedBirthdayPerson || !wishMessage.trim()) return;

    const newWish = {
      wish_id: 'W' + Date.now(),
      target_member_id: selectedBirthdayPerson.id,
      sender_name: currentUser.nickname,
      message: wishMessage,
      sticker_type: wishSticker,
      year: String(new Date().getFullYear()),
      created_at: new Date().toISOString().split('T')[0]
    };

    setDb(prev => ({ ...prev, hbdWishes: [newWish, ...prev.hbdWishes] }));
    setWishMessage('');
    await postToGAS('insert', 'HBD_Wishes', newWish);
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    if (!window.html2canvas) {
      showToast('กรุณาใส่สคริปต์ html2canvas ในไฟล์ index.html ก่อนนะคะ', 'error');
      return;
    }

    setDownloadingCard(true);
    try {
      const canvas = await window.html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const receiverName = selectedBirthdayPerson ? selectedBirthdayPerson.nickname : 'Friend';
      link.href = image;
      link.download = `HBD-Card-${receiverName}.png`;
      link.click();

      showToast('บันทึกรูปการ์ด HBD ลงเครื่องเรียบร้อย! 📸✨');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการบันทึกรูปการ์ด', 'error');
    } finally {
      setDownloadingCard(false);
    }
  };

  const handleSaveCareLog = async (e) => {
    e.preventDefault();
    if (!careForm.member_id) {
      showToast('กรุณาเลือกชื่อน้องที่ดูแลก่อนนะคะ', 'error');
      return;
    }

    const newLog = {
      log_id: 'LOG' + Date.now(),
      date: careForm.date,
      mentor_id: currentUser.id,
      member_id: careForm.member_id,
      lesson_id: careForm.lesson_id,
      activities: careForm.activities.join(', '),
      note: careForm.note,
      prayer_point: careForm.prayer_point
    };

    setDb(prev => ({ ...prev, careLogs: [newLog, ...prev.careLogs] }));
    setCareForm({
      member_id: careForm.member_id,
      date: new Date().toISOString().split('T')[0],
      lesson_id: '',
      activities: [],
      note: '',
      prayer_point: ''
    });

    await postToGAS('insert', 'Care_Logs', newLog);
  };

  const toggleActivity = (act) => {
    setCareForm(prev => {
      const exists = prev.activities.includes(act);
      return {
        ...prev,
        activities: exists ? prev.activities.filter(a => a !== act) : [...prev.activities, act]
      };
    });
  };

  // ลิสต์หน่วย ➔ เซลล์ ➔ ชื่อ สำหรับหน้า Login
  const availableUnits = [...new Set(db.members.map(m => String(m.unit || '').trim()).filter(Boolean))];
  const availableCellsInUnit = [...new Set(
    db.members
      .filter(m => !selUnit || String(m.unit || '').trim() === selUnit)
      .map(m => String(m.cell_group || '').trim())
      .filter(Boolean)
  )];
  const availableMembersInCell = db.members.filter(m =>
    (!selUnit || String(m.unit || '').trim() === selUnit) &&
    (!selCell || String(m.cell_group || '').trim() === selCell)
  );

  // ตัวกรองทำเนียบสมาชิก
  const allCellGroups = [...new Set(db.members.map(m => String(m.cell_group || '').trim()).filter(Boolean))];
  const filteredDirectory = db.members.filter(m => {
    const matchCell = cellFilter === 'ALL' || String(m.cell_group || '').trim() === cellFilter;
    const matchSearch = !searchQuery ||
      m.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fullname?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCell && matchSearch;
  });

  const birthdayMembers = db.members.filter(m => {
    if (!m.birthdate) return false;
    const parts = String(m.birthdate).split(/[-/]/);
    const month = parts.length >= 2 ? parseInt(parts[1], 10) : null;
    return month === parseInt(selectedMonth, 10);
  });

  // กรองรายชื่อลูกแกะในหน้าสมุดพกตามลำดับสายการดูแลจริง (เขต/แขวง ➔ หน่วย ➔ เซลล์ ➔ พี่เลี้ยง)
  const mySheepList = db.members.filter(m => {
    if (!currentUser || m.id === currentUser.id) return false;
    if (isWardWideLeader(currentUser)) {
      return true; // หน.เขต / หนว. / หนข. เห็นทั้งแขวง
    }
    if (isAdminLeader(currentUser)) {
      // หนน. เห็นทุกคนในหน่วยของตัวเอง
      return String(m.unit || '').trim() === String(currentUser.unit || '').trim();
    }
    // หนซ. / รองหนซ. / พล. เห็นน้องในกลุ่มเซลล์เดียวกัน หรือคนที่ผูก mentor_id เป็นตัวเอง
    return (
      String(m.mentor_id || '').trim() === String(currentUser.id).trim() ||
      String(m.cell_group || '').trim() === String(currentUser.cell_group || '').trim()
    );
  });

  const careAvailableCells = [...new Set(mySheepList.map(m => String(m.cell_group || '').trim()).filter(Boolean))];
  const displayedSheepList = mySheepList.filter(m =>
    careCellFilter === 'ALL' || String(m.cell_group || '').trim() === careCellFilter
  );

  // ============================================================================
  // Modal ลงทะเบียน / เพิ่มสมาชิกใหม่
  // ============================================================================
  const renderAddMemberModal = () => {
    if (!showAddMemberModal) return null;
    const mentors = db.members.filter(m => isLeaderOrMentor(m));
    const canAssignAllRoles = isLoggedIn && isAdminLeader(currentUser);
    const canAssignSheepRoles = isLoggedIn && isLeaderOrMentor(currentUser);

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 my-8 border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-lg font-extrabold text-slate-800">
              {isLoggedIn ? '➕ เพิ่มสมาชิก / ลูกแกะใหม่' : '✨ ลงทะเบียนสมาชิกใหม่'}
            </h3>
            <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">✖</button>
          </div>

          <form onSubmit={handleCreateMember} className="space-y-4">
            <div className="flex items-center gap-4 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
              <AvatarDisplay avatar={newMemberForm.avatar_url} nickname={newMemberForm.nickname} sizeClass="w-16 h-16" roundedClass="rounded-2xl" />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-700 mb-1.5">รูปโปรไฟล์ (จำเป็นต้องอัปโหลดรูปจริง) *</div>
                <label className="inline-block cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition">
                  📷 เลือกรูปถ่ายจากมือถือ / เครื่อง
                  <input type="file" accept="image/*" onChange={handleNewMemberAvatarUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">คำนำหน้า *</label>
                <select
                  value={newMemberForm.prefix}
                  onChange={e => setNewMemberForm({ ...newMemberForm, prefix: e.target.value })}
                  className="w-full mt-1 px-2.5 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                >
                  {PREFIX_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">ชื่อจริง - นามสกุล *</label>
                <input
                  type="text" required
                  value={newMemberForm.fullname}
                  onChange={e => setNewMemberForm({ ...newMemberForm, fullname: e.target.value })}
                  placeholder="ไม่ต้องใส่คำนำหน้าซ้ำ"
                  className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">ชื่อเล่น *</label>
                <input
                  type="text" required
                  value={newMemberForm.nickname}
                  onChange={e => setNewMemberForm({ ...newMemberForm, nickname: e.target.value })}
                  placeholder="เช่น ต้นกล้า"
                  className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">วันเกิด *</label>
                <input
                  type="date" required
                  value={newMemberForm.birthdate}
                  onChange={e => setNewMemberForm({ ...newMemberForm, birthdate: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={newMemberForm.phone}
                  onChange={e => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                  placeholder="08X-XXX-XXXX"
                  className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">หน่วย *</label>
                <input
                  type="text" required
                  value={newMemberForm.unit}
                  onChange={e => setNewMemberForm({ ...newMemberForm, unit: e.target.value })}
                  placeholder="เช่น BeOne"
                  className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">กลุ่มเซลล์ *</label>
                <input
                  type="text" required
                  value={newMemberForm.cell_group}
                  onChange={e => setNewMemberForm({ ...newMemberForm, cell_group: e.target.value })}
                  placeholder="เช่น BeTon"
                  className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">พี่เลี้ยงผู้ดูแล</label>
                <select
                  value={newMemberForm.mentor_id}
                  onChange={e => setNewMemberForm({ ...newMemberForm, mentor_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="">-- เลือกพี่เลี้ยง --</option>
                  {mentors.map(mt => (
                    <option key={mt.id} value={mt.id}>{mt.nickname} ({mt.role} • {mt.cell_group})</option>
                  ))}
                </select>
              </div>

              {canAssignAllRoles ? (
                <div>
                  <label className="text-xs font-semibold text-slate-600">สถานะในแขวง</label>
                  <select
                    value={newMemberForm.role}
                    onChange={e => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm font-semibold"
                  >
                    {ROLE_DEFINITIONS.map(r => (
                      <option key={r.code} value={r.code}>{r.code} — {r.label}</option>
                    ))}
                  </select>
                </div>
              ) : canAssignSheepRoles ? (
                <div>
                  <label className="text-xs font-semibold text-slate-600">สถานะน้อง</label>
                  <select
                    value={newMemberForm.role}
                    onChange={e => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm font-semibold"
                  >
                    <option value="ผจ.">ผจ. — ผู้สนใจ</option>
                    <option value="ผชม.">ผชม. — ผู้เชื่อใหม่</option>
                    <option value="ผช.">ผช. — ผู้เชื่อ</option>
                    <option value="สช.">สช. — สมาชิก</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-600">เมนูโปรด</label>
                  <input
                    type="text"
                    value={newMemberForm.fav_food}
                    onChange={e => setNewMemberForm({ ...newMemberForm, fav_food: e.target.value })}
                    placeholder="เช่น ชาบู, ชานม"
                    className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">หัวข้ออธิษฐานเผื่อ</label>
              <input
                type="text"
                value={newMemberForm.prayer_request}
                onChange={e => setNewMemberForm({ ...newMemberForm, prayer_request: e.target.value })}
                placeholder="เรื่องที่อยากให้พี่ๆ เพื่อนๆ ช่วยอธิษฐานเผื่อ..."
                className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddMemberModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold">
                ยกเลิก
              </button>
              <button type="submit" disabled={syncing} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow">
                {syncing ? 'กำลังบันทึก...' : '✅ บันทึกข้อมูล'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============================================================================
  // หน้าจอเข้าสู่ระบบ (เลือก หน่วย ➔ เซลล์ ➔ ชื่อ)
  // ============================================================================
  if (!isLoggedIn || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        {renderAddMemberModal()}

        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl font-medium text-sm ${
            toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {toast.msg}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl p-7 sm:p-8 max-w-md w-full border border-indigo-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-indigo-200 text-white">
              🐑
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800">BETEEN</h1>
            <p className="text-xs text-slate-500 mt-1">เลือกหน่วย กลุ่มเซลล์ และชื่อของคุณเพื่อเข้าใช้งาน</p>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-indigo-600 font-semibold animate-pulse">
              กำลังโหลดรายชื่อสมาชิกจากฐานข้อมูลแขวง...
            </div>
          ) : (
            <form onSubmit={handleSelectLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">1. เลือกหน่วย</label>
                <select
                  value={selUnit}
                  onChange={e => {
                    setSelUnit(e.target.value);
                    setSelCell('');
                    setSelMemberId('');
                  }}
                  className="w-full px-3.5 py-3 bg-white text-slate-800 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="">-- เลือกหน่วยของคุณ --</option>
                  {availableUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">2. เลือกกลุ่มเซลล์</label>
                <select
                  value={selCell}
                  onChange={e => {
                    setSelCell(e.target.value);
                    setSelMemberId('');
                  }}
                  disabled={!selUnit}
                  className="w-full px-3.5 py-3 bg-white disabled:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="">-- เลือกกลุ่มเซลล์ --</option>
                  {availableCellsInUnit.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">3. เลือกชื่อของคุณ</label>
                <select
                  value={selMemberId}
                  onChange={e => setSelMemberId(e.target.value)}
                  disabled={!selCell}
                  className="w-full px-3.5 py-3 bg-white disabled:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="">-- เลือกชื่อสมาชิก --</option>
                  {availableMembersInCell.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nickname} {formatFullName(m) ? `(${formatFullName(m)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selMemberId}
                className="w-full py-3.5 mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition text-sm"
              >
                เข้าสู่ระบบ
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={openAddMemberModal}
              className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition"
            >
              ✨ ยังไม่มีชื่อในรายการ? กดลงทะเบียนเข้าแขวงที่นี่
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // หน้าจอหลักเมื่อเข้าสู่ระบบแล้ว
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {renderAddMemberModal()}

      {/* Modal เพิ่มบทเรียนใหม่ */}
      {showAddLessonModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 my-8 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-extrabold text-slate-800">📖 เพิ่มบทเรียนใหม่เข้าคลัง</h3>
              <button onClick={() => setShowAddLessonModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">✖</button>
            </div>
            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-600">ชื่อชุดหนังสือ</label>
                  <input
                    type="text" required
                    value={newLessonForm.book_name}
                    onChange={e => setNewLessonForm({ ...newLessonForm, book_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">บทที่ *</label>
                  <input
                    type="number" required
                    value={newLessonForm.chapter_no}
                    onChange={e => setNewLessonForm({ ...newLessonForm, chapter_no: e.target.value })}
                    placeholder="เช่น 2"
                    className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">หัวข้อบทเรียน *</label>
                <input
                  type="text" required
                  value={newLessonForm.title}
                  onChange={e => setNewLessonForm({ ...newLessonForm, title: e.target.value })}
                  placeholder="เช่น ชีวิตใหม่และการเริ่มต้นกับพระเจ้า"
                  className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">สรุปเนื้อหาสำคัญ *</label>
                <textarea
                  rows="3" required
                  value={newLessonForm.summary}
                  onChange={e => setNewLessonForm({ ...newLessonForm, summary: e.target.value })}
                  placeholder="สรุปประเด็นหลักและข้อพระคัมภีร์ให้พี่เลี้ยงอ่านทวนเร็วๆ..."
                  className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Tips แนะแนวคำถามชวนคุยสำหรับพี่เลี้ยง</label>
                <textarea
                  rows="2"
                  value={newLessonForm.mentor_tips}
                  onChange={e => setNewLessonForm({ ...newLessonForm, mentor_tips: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">ลิงก์ไฟล์หนังสือ PDF / Google Drive</label>
                <input
                  type="text"
                  value={newLessonForm.pdf_url}
                  onChange={e => setNewLessonForm({ ...newLessonForm, pdf_url: e.target.value })}
                  placeholder="/lesson52.pdf หรือ https://drive.google.com/..."
                  className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddLessonModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold">
                  ยกเลิก
                </button>
                <button type="submit" disabled={syncing} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow">
                  {syncing ? 'กำลังบันทึก...' : '📚 บันทึกบทเรียน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl font-medium text-sm flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-rose-600 text-white' : toast.type === 'info' ? 'bg-amber-500 text-slate-900' : 'bg-emerald-600 text-white'
        }`}>
          <span>{toast.msg}</span>
        </div>
      )}

      {isDemoMode && (
        <div className="text-xs py-2 px-4 text-center font-medium bg-amber-100 text-amber-800 border-b border-amber-200">
          ⚡ อย่าลืมนำลิงก์ <code>GAS_URL</code> มาวางที่บรรทัดที่ 6 ในไฟล์ <code>App.jsx</code> เพื่อเชื่อมต่อ Google Sheets จริงนะคะ
        </div>
      )}

      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-sm">
              🐑
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-base sm:text-lg leading-tight">บ้านของเรา (คอมมูนิตี้แขวง)</h1>
              <p className="text-xs text-slate-500">{currentUser.unit} • {currentUser.cell_group}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isDemoMode && (
              <button
                onClick={() => fetchAllData(false)}
                disabled={loading}
                className="text-xs px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
              >
                {loading ? 'กำลังซิงก์...' : '🔄 รีเฟรช'}
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">
              <span>{currentUser.nickname}</span>
              <RoleBadge role={currentUser.role} />
            </div>

            <button
              onClick={handleLogout}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 font-semibold transition"
            >
              สลับชื่อ / ออก
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-slate-100 bg-slate-50/60">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'profile' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🪪</span> โปรไฟล์ & ชาวแขวง
          </button>

          <button
            onClick={() => setActiveTab('birthday')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'birthday' ? 'border-pink-500 text-pink-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎂</span> บอร์ดวันเกิด & ทำการ์ด HBD
          </button>

          {isLeaderOrMentor(currentUser) && (
            <>
              <button
                onClick={() => setActiveTab('care')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'care' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📋</span> สมุดพกดูแลลูกแกะ
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">ผู้นำ/พล.</span>
              </button>

              <button
                onClick={() => setActiveTab('lessons')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'lessons' ? 'border-amber-500 text-amber-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📖</span> คลังบทเรียนออนไลน์
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">ผู้นำ/พล.</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {/* =====================================================================
            TAB 1: โปรไฟล์ชาวแขวง & ทำเนียบสมาชิก
           ===================================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className={`rounded-3xl p-6 sm:p-8 shadow-xl bg-gradient-to-br ${CARD_THEMES[currentUser.card_theme] || CARD_THEMES.blue} relative overflow-hidden`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/25 pb-5">
                    <div className="flex items-center gap-4">
                      <AvatarDisplay
                        avatar={currentUser.avatar_url}
                        nickname={currentUser.nickname}
                        sizeClass="w-20 h-20"
                        roundedClass="rounded-2xl"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <RoleBadge role={currentUser.role} showFull={true} />
                          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/15 backdrop-blur-sm">
                            {currentUser.unit} • {currentUser.cell_group}
                          </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold">
                          {currentUser.nickname} {formatFullName(currentUser) ? `(${formatFullName(currentUser)})` : ''}
                        </h2>
                        <p className="text-sm opacity-90">รหัสสมาชิก: {currentUser.id} • เกิดวันที่: {currentUser.birthdate || '-'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEditForm({
                          prefix: currentUser.prefix || 'นางสาว',
                          nickname: currentUser.nickname || '',
                          fullname: currentUser.fullname || '',
                          birthdate: currentUser.birthdate || '',
                          role: currentUser.role || 'สช.',
                          cell_group: currentUser.cell_group || '',
                          unit: currentUser.unit || '',
                          phone: currentUser.phone || '',
                          fav_food: currentUser.fav_food || '',
                          prayer_request: currentUser.prayer_request || '',
                          card_theme: currentUser.card_theme || 'blue',
                          avatar_url: currentUser.avatar_url || ''
                        });
                        setIsEditingProfile(!isEditingProfile);
                      }}
                      className="px-4 py-2 rounded-xl bg-white/90 text-slate-800 hover:bg-white text-xs font-bold shadow transition shrink-0"
                    >
                      {isEditingProfile ? '✖ ยกเลิก' : '✏️ แต่งการ์ด / แก้โปรไฟล์'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                    <div className="bg-black/15 backdrop-blur-sm rounded-2xl p-4">
                      <div className="text-xs font-semibold opacity-80 mb-1">🍲 เมนูโปรดหลังจบกลุ่ม / คาเฟ่ที่ชอบ</div>
                      <div className="font-bold text-base">{currentUser.fav_food || 'ยังไม่ได้ระบุ'}</div>
                    </div>
                    <div className="bg-black/15 backdrop-blur-sm rounded-2xl p-4">
                      <div className="text-xs font-semibold opacity-80 mb-1">🙏 หัวข้ออธิษฐานเผื่อประจำเดือนนี้</div>
                      <div className="font-bold text-base">{currentUser.prayer_request || 'ยังไม่ได้ระบุ'}</div>
                    </div>
                  </div>
                </div>

                {/* ฟอร์มแก้ไขโปรไฟล์ */}
                {isEditingProfile && (
                  <form onSubmit={handleSaveProfile} className="mt-4 bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-base">🎨 อัปโหลดรูปโปรไฟล์ & แก้ไขข้อมูลส่วนตัว</h3>
                      <RoleBadge role={currentUser.role} showFull={true} />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                      <AvatarDisplay
                        avatar={editForm.avatar_url}
                        nickname={editForm.nickname}
                        sizeClass="w-20 h-20"
                        roundedClass="rounded-2xl"
                      />
                      <div className="flex-1 text-center sm:text-left space-y-1.5">
                        <div className="text-xs font-bold text-slate-700">รูปถ่ายประจำตัวบนบัตรสมาชิกและการ์ดวันเกิด</div>
                        <label className="inline-block cursor-pointer px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition">
                          📸 เลือกรูปโปรไฟล์ใหม่จากเครื่อง / มือถือ
                          <input type="file" accept="image/*" onChange={handleEditAvatarUpload} className="hidden" />
                        </label>
                        <p className="text-[11px] text-slate-500">ระบบจะครอปเป็นสี่เหลี่ยมจัตุรัสให้อัตโนมัติ แนะนำให้ใช้รูปที่เห็นใบหน้าชัดเจนนะคะ</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600">คำนำหน้า</label>
                        <select
                          value={editForm.prefix}
                          onChange={e => setEditForm({ ...editForm, prefix: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                        >
                          {PREFIX_OPTIONS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-600">ชื่อจริง - นามสกุล</label>
                        <input
                          type="text"
                          value={editForm.fullname}
                          onChange={e => setEditForm({ ...editForm, fullname: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600">ชื่อเล่น *</label>
                        <input
                          type="text" required
                          value={editForm.nickname}
                          onChange={e => setEditForm({ ...editForm, nickname: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600">วันเกิด</label>
                        <input
                          type="date"
                          value={editForm.birthdate}
                          onChange={e => setEditForm({ ...editForm, birthdate: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600">หน่วย</label>
                        <input
                          type="text"
                          value={editForm.unit}
                          onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600">กลุ่มเซลล์</label>
                        <input
                          type="text"
                          value={editForm.cell_group}
                          onChange={e => setEditForm({ ...editForm, cell_group: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600">สีธีมการ์ดประจำตัว</label>
                        <select
                          value={editForm.card_theme}
                          onChange={e => setEditForm({ ...editForm, card_theme: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                        >
                          <option value="blue">ฟ้าคราม (Sky Blue)</option>
                          <option value="yellow">เหลืองส้มสดใส (Sunny Yellow)</option>
                          <option value="pink">ชมพูพาสเทล (Sweet Pink)</option>
                          <option value="green">เขียวมิ้นต์ (Fresh Green)</option>
                          <option value="purple">ม่วงลาเวนเดอร์ (Royal Purple)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600">เบอร์ติดต่อ</label>
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    {isAdminLeader(currentUser) && (
                      <div>
                        <label className="text-xs font-semibold text-indigo-600">สถานะในแขวง (แก้ไขได้เฉพาะระดับ หนน. / หนว. / หน.เขต)</label>
                        <select
                          value={editForm.role}
                          onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-indigo-50/50 text-slate-800 border border-indigo-200 rounded-xl text-sm font-semibold"
                        >
                          {editForm.role && !ROLE_DEFINITIONS.some(r => r.code === editForm.role) && (
                            <option value={editForm.role}>{editForm.role}</option>
                          )}
                          {ROLE_DEFINITIONS.map(r => (
                            <option key={r.code} value={r.code}>{r.code} — {r.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600">เมนูโปรดเวลาไปกินข้าวด้วยกัน</label>
                        <input
                          type="text"
                          value={editForm.fav_food}
                          onChange={e => setEditForm({ ...editForm, fav_food: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600">หัวข้ออธิษฐานเผื่อ</label>
                        <input
                          type="text"
                          value={editForm.prayer_request}
                          onChange={e => setEditForm({ ...editForm, prayer_request: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={syncing}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow"
                      >
                        {syncing ? 'กำลังบันทึก...' : '💾 บันทึกการเปลี่ยนแปลง'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* กล่องสุ่มคำหนุนใจประจำวัน */}
              <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                      ✨ Daily Blessing Box
                    </span>
                    <span className="text-xl">🎁</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-2">ข้อความหนุนใจประจำวัน</h3>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-100 text-slate-700 text-sm leading-relaxed min-h-[100px] flex items-center">
                    {quote}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const random = DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)];
                    setQuote(random);
                  }}
                  className="mt-4 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <span>🎲</span> กดสุ่มรับคำหนุนใจใหม่
                </button>
              </div>
            </div>

            {/* ทำเนียบสมาชิก */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">👨‍👩‍👧‍👦 ทำเนียบสมาชิกในแขวง ({filteredDirectory.length} คน)</h3>
                  <p className="text-xs text-slate-500">ดูเมนูโปรดและหัวข้ออธิษฐานเผื่อของเพื่อนๆ พี่ๆ ในแขวง</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="🔍 ค้นหาชื่อ..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <select
                    value={cellFilter}
                    onChange={e => setCellFilter(e.target.value)}
                    className="px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="ALL">ทุกกลุ่มเซลล์</option>
                    {allCellGroups.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {isLeaderOrMentor(currentUser) && (
                    <button
                      onClick={openAddMemberModal}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                    >
                      ➕ เพิ่มสมาชิกใหม่
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredDirectory.map(member => (
                  <div key={member.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <AvatarDisplay
                          avatar={member.avatar_url}
                          nickname={member.nickname}
                          sizeClass="w-12 h-12"
                          roundedClass="rounded-xl"
                        />
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-800 truncate">{member.nickname}</div>
                          <div className="text-[11px] text-slate-500 truncate mb-1">{formatFullName(member)}</div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <RoleBadge role={member.role} />
                            <span className="text-[11px] text-slate-500 font-medium truncate">{member.cell_group}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                        <div><strong>🎂 วันเกิด:</strong> {member.birthdate || '-'}</div>
                        <div><strong>🍲 ของโปรด:</strong> {member.fav_food || '-'}</div>
                        <div><strong>🙏 อธิษฐานเผื่อ:</strong> {member.prayer_request || '-'}</div>
                        {isLeaderOrMentor(currentUser) && member.phone && (
                          <div className="pt-1 border-t border-slate-200/70 text-emerald-700">
                            <strong>📞 เบอร์ติดต่อ:</strong> {member.phone}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedBirthdayPerson(member);
                        setActiveTab('birthday');
                      }}
                      className="mt-3 w-full py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 font-semibold text-xs transition"
                    >
                      💌 ส่งการ์ดอวยพร HBD
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: บอร์ดวันเกิด & ทำการ์ดอวยพร HBD
           ===================================================================== */}
        {activeTab === 'birthday' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider bg-white/20 px-3 py-1 rounded-full">
                  🎉 Monthly Birthday Board
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">บอร์ดฉลองวันเกิดชาวแขวง</h2>
                <p className="text-sm opacity-90 mt-1">ส่งความรัก คำอธิษฐานอวยพร และดาวน์โหลดการ์ด HBD สวยๆ ส่งให้เพื่อนกัน!</p>
              </div>

              <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl flex items-center gap-2">
                <label className="text-xs font-bold">ดูคนเกิดเดือน:</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="bg-white text-slate-800 font-bold text-sm px-3 py-1.5 rounded-xl outline-none cursor-pointer"
                >
                  {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'].map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>{mName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 text-lg mb-3">
                🎂 เจ้าของวันเกิดประจำเดือนนี้ ({birthdayMembers.length} คน)
              </h3>

              {birthdayMembers.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-sm">
                  ไม่มีสมาชิกที่เกิดในเดือนนี้ ลองกดเปลี่ยนดูเดือนอื่นๆ ที่มุมขวาบนได้เลยนะคะ 🎈
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {birthdayMembers.map(member => (
                    <div
                      key={member.id}
                      onClick={() => setSelectedBirthdayPerson(member)}
                      className={`cursor-pointer rounded-2xl p-5 border-2 transition flex items-center justify-between ${
                        selectedBirthdayPerson?.id === member.id
                          ? 'border-pink-500 bg-pink-50/40 shadow-md'
                          : 'border-slate-200 bg-white hover:border-pink-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <AvatarDisplay avatar={member.avatar_url} nickname={member.nickname} sizeClass="w-14 h-14" roundedClass="rounded-2xl" />
                        <div>
                          <div className="font-extrabold text-slate-800 text-base">{member.nickname}</div>
                          <div className="text-xs text-pink-600 font-semibold">เกิดวันที่: {member.birthdate}</div>
                          <div className="text-xs text-slate-500 mt-0.5">ของโปรด: {member.fav_food || '-'}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-pink-500 text-white shadow-sm shrink-0">
                        ทำการ์ด 💌
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <span>🎨</span> สตูดิโอสร้างการ์ดอวยพรวันเกิด
                </h3>

                <form onSubmit={handleSendWish} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">เลือกเจ้าของวันเกิดที่ต้องการอวยพร</label>
                    <select
                      value={selectedBirthdayPerson?.id || ''}
                      onChange={e => {
                        const found = db.members.find(m => m.id === e.target.value);
                        setSelectedBirthdayPerson(found);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white text-slate-800 rounded-xl border border-slate-200 text-sm font-semibold"
                      required
                    >
                      <option value="">-- กดเลือกชื่อเพื่อน/พี่น้องในแขวง --</option>
                      {db.members.map(m => (
                        <option key={m.id} value={m.id}>{m.nickname} {m.birthdate ? `(เกิด ${m.birthdate})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">เลือกสติ๊กเกอร์ตกแต่งการ์ด</label>
                    <div className="flex gap-2 flex-wrap">
                      {HBD_STICKERS.map(st => (
                        <button
                          type="button"
                          key={st.id}
                          onClick={() => setWishSticker(st.emoji)}
                          className={`px-3 py-2 rounded-xl border text-sm flex items-center gap-1.5 transition ${
                            wishSticker === st.emoji ? 'border-pink-500 bg-pink-50 font-bold text-pink-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-lg">{st.emoji}</span>
                          <span className="text-xs">{st.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">สีพื้นหลังการ์ด</label>
                    <div className="flex gap-2">
                      {[
                        { label: 'ชมพูสดใส', cls: 'from-pink-400 to-rose-500' },
                        { label: 'ฟ้าพาสเทล', cls: 'from-sky-400 to-indigo-500' },
                        { label: 'ส้มพีช', cls: 'from-amber-400 to-orange-500' },
                        { label: 'ม่วงกาแล็กซี', cls: 'from-violet-500 to-fuchsia-600' },
                      ].map(bg => (
                        <button
                          type="button"
                          key={bg.cls}
                          onClick={() => setCardBg(bg.cls)}
                          className={`h-8 flex-1 rounded-lg bg-gradient-to-r ${bg.cls} border-2 ${
                            cardBg === bg.cls ? 'border-slate-900 scale-105' : 'border-transparent opacity-75'
                          }`}
                          title={bg.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ข้อความอวยพร / คำอธิษฐานเผื่อ</label>
                    <textarea
                      rows="3"
                      placeholder="เขียนคำอวยพรน่ารักๆ หรือคำอธิษฐานอวยพรให้เจ้าของวันเกิด..."
                      value={wishMessage}
                      onChange={e => setWishMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white text-slate-800 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={syncing || !selectedBirthdayPerson}
                    className="w-full py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition"
                  >
                    {syncing ? 'กำลังส่งการ์ด...' : '🚀 แปะการ์ดอวยพรขึ้นบอร์ดแขวง'}
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                <div
                  ref={cardRef}
                  className={`rounded-3xl p-8 bg-gradient-to-br ${cardBg} text-white shadow-xl relative overflow-hidden min-h-[290px] flex flex-col justify-between`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      {selectedBirthdayPerson && (
                        <AvatarDisplay
                          avatar={selectedBirthdayPerson.avatar_url}
                          nickname={selectedBirthdayPerson.nickname}
                          sizeClass="w-16 h-16"
                          roundedClass="rounded-2xl"
                        />
                      )}
                      <div>
                        <span className="text-[11px] uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full font-bold inline-block">
                          HAPPY BIRTHDAY
                        </span>
                        <h4 className="text-2xl sm:text-3xl font-extrabold mt-2">
                          สุขสันต์วันเกิด {selectedBirthdayPerson ? selectedBirthdayPerson.nickname : '...'}!
                        </h4>
                      </div>
                    </div>
                    <div className="text-4xl bg-white/20 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                      {wishSticker}
                    </div>
                  </div>

                  <div className="my-6 bg-white/95 text-slate-800 p-5 rounded-2xl shadow-lg">
                    <p className="text-base font-medium leading-relaxed whitespace-pre-wrap">
                      “{wishMessage || 'พิมพ์ข้อความอวยพรด้านซ้าย แล้วการ์ดสวยๆ จะแสดงผลตรงนี้ทันที กดเซฟเป็นรูปส่งให้เพื่อนในกลุ่ม LINE ได้เลย!'}”
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold opacity-95">
                    <span>จากใจ: {currentUser.nickname} ({currentUser.cell_group})</span>
                    <span>🙏 ขอพระเจ้าอวยพรอย่างบริบูรณ์</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCard}
                  disabled={downloadingCard}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
                >
                  <span>📸</span>
                  <span>{downloadingCard ? 'กำลังสร้างไฟล์รูปภาพ...' : 'ดาวน์โหลดการ์ดเป็นรูปภาพ (PNG) ส่งเข้า LINE'}</span>
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 text-lg mb-3">📌 กำแพงการ์ดคำอวยพรล่าสุดในแขวง</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {db.hbdWishes.map(wish => {
                  const target = db.members.find(m => m.id === wish.target_member_id);
                  return (
                    <div key={wish.wish_id} className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-pink-100 text-pink-700">
                          ถึง: {target ? target.nickname : wish.target_member_id}
                        </span>
                        <span className="text-2xl">{wish.sticker_type || '🎂'}</span>
                      </div>
                      <p className="text-sm text-slate-700 my-3 leading-relaxed">“{wish.message}”</p>
                      <div className="text-xs text-slate-500 flex justify-between border-t border-amber-200/60 pt-2">
                        <span>จาก: <strong>{wish.sender_name}</strong></span>
                        <span>{wish.created_at}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: สมุดพกดูแลลูกแกะ (แบ่งขอบเขตการมองเห็นตาม หน.เขต/หนว. ➔ หนน. ➔ หนซ./รองหนซ./พล.)
           ===================================================================== */}
        {activeTab === 'care' && isLeaderOrMentor(currentUser) && (
          <div className="space-y-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    🐑 ภาพรวมการเลี้ยงดู ({displayedSheepList.length} คน)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    มุมมองของ <RoleBadge role={currentUser.role} showFull={true} /> • {
                      isWardWideLeader(currentUser)
                        ? 'แสดงสมาชิกทุกหน่วยทั้งแขวง'
                        : isAdminLeader(currentUser)
                          ? `แสดงสมาชิกในหน่วย ${currentUser.unit}`
                          : `แสดงสมาชิกในเซลล์ ${currentUser.cell_group}`
                    }
                  </p>
                </div>

                {careAvailableCells.length > 1 && (
                  <select
                    value={careCellFilter}
                    onChange={e => setCareCellFilter(e.target.value)}
                    className="px-3.5 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-xs"
                  >
                    <option value="ALL">ทุกกลุ่มเซลล์ในสายดูแล ({mySheepList.length} คน)</option>
                    {careAvailableCells.map(c => (
                      <option key={c} value={c}>เซลล์: {c}</option>
                    ))}
                  </select>
                )}
              </div>

              {displayedSheepList.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-sm">
                  ยังไม่มีรายชื่อสมาชิกในสายการดูแลนี้ กดปุ่ม <strong>"➕ เพิ่มสมาชิกใหม่"</strong> ในหน้าแรกได้เลยค่ะ
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {displayedSheepList.map(sheep => {
                    const logs = db.careLogs
                      .filter(l => l.member_id === sheep.id)
                      .sort((a, b) => new Date(b.date) - new Date(a.date));
                    const taughtLessons = [...new Set(logs.map(l => l.lesson_id).filter(Boolean))];
                    const totalLessons = db.lessons.length || 1;
                    const progressPct = Math.min(100, Math.round((taughtLessons.length / totalLessons) * 100));
                    const lastLog = logs[0];

                    const daysSinceLastCare = lastLog
                      ? Math.floor((new Date() - new Date(lastLog.date)) / (1000 * 60 * 60 * 24))
                      : null;
                    const needsFollowUp = daysSinceLastCare === null || daysSinceLastCare > 14;

                    return (
                      <div key={sheep.id} className={`bg-white rounded-2xl p-5 shadow-sm border flex flex-col justify-between ${
                        needsFollowUp ? 'border-amber-300' : 'border-slate-200'
                      }`}>
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-3">
                              <AvatarDisplay avatar={sheep.avatar_url} nickname={sheep.nickname} sizeClass="w-12 h-12" roundedClass="rounded-xl" />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-slate-800">{sheep.nickname}</h4>
                                  <RoleBadge role={sheep.role} />
                                </div>
                                <p className="text-[11px] text-slate-500">{formatFullName(sheep)}</p>
                                <p className="text-[11px] text-indigo-600 font-semibold">{sheep.unit} • {sheep.cell_group}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                              needsFollowUp ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {daysSinceLastCare === null ? '⚠️ รอเริ่มดูแล' : daysSinceLastCare > 14 ? `⚠️ ห่าง ${daysSinceLastCare} วัน` : `ดูแล ${logs.length} ครั้ง`}
                            </span>
                          </div>

                          <div className="mb-3">
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-slate-600">ความคืบหน้าบทเรียน</span>
                              <span className="text-emerald-600">{taughtLessons.length} / {totalLessons} บท ({progressPct}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl space-y-1">
                            <div><strong>🙏 คำอธิษฐานน้อง:</strong> {sheep.prayer_request || '-'}</div>
                            <div><strong>📅 ล่าสุดเมื่อ:</strong> {lastLog ? `${lastLog.date} (${lastLog.activities})` : 'ยังไม่มีบันทึก'}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setCareForm(prev => ({ ...prev, member_id: sheep.id }));
                            setSelectedSheepId(sheep.id);
                          }}
                          className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                        >
                          ✍️ บันทึกการดูแล {sheep.nickname}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <form onSubmit={handleSaveCareLog} className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-800 text-lg">📝 บันทึกการใช้เวลากับน้อง</h3>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เลือกน้องที่ดูแล</label>
                  <select
                    value={careForm.member_id}
                    onChange={e => setCareForm({ ...careForm, member_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm font-semibold"
                    required
                  >
                    <option value="">-- เลือกชื่อลูกแกะ --</option>
                    {mySheepList.map(m => (
                      <option key={m.id} value={m.id}>{m.nickname} ({m.role} • {m.cell_group})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">วันที่ใช้เวลาด้วยกัน</label>
                  <input
                    type="date"
                    value={careForm.date}
                    onChange={e => setCareForm({ ...careForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">กิจกรรมที่ทำร่วมกัน (เลือกได้หลายข้อ)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['สอนบทเรียน', 'กินข้าว/คาเฟ่', 'โทรคุย/ทักแชท', 'พาเข้ากลุ่มเซลล์', 'อธิษฐานเผื่อ', 'ไปรับ-ส่ง'].map(act => (
                      <button
                        type="button"
                        key={act}
                        onClick={() => toggleActivity(act)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left transition ${
                          careForm.activities.includes(act)
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {careForm.activities.includes(act) ? '☑️ ' : '⬜ '} {act}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">บทเรียนที่สอน (ถ้ามี)</label>
                  <select
                    value={careForm.lesson_id}
                    onChange={e => setCareForm({ ...careForm, lesson_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">-- ไม่ได้สอนบทเรียนในครั้งนี้ --</option>
                    {db.lessons.map(l => (
                      <option key={l.lesson_id} value={l.lesson_id}>
                        บทที่ {l.chapter_no}: {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">บันทึกอาการ / ความเข้าใจของน้อง</label>
                  <textarea
                    rows="2"
                    placeholder="เช่น น้องเปิดใจเล่าเรื่องเรียน ตั้งใจฟังบทเรียนดีมาก..."
                    value={careForm.note}
                    onChange={e => setCareForm({ ...careForm, note: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">หัวข้ออธิษฐานเผื่อน้องเพิ่มเติม</label>
                  <input
                    type="text"
                    placeholder="เช่น ขอให้สอบผ่าน, สุขภาพคุณแม่"
                    value={careForm.prayer_point}
                    onChange={e => setCareForm({ ...careForm, prayer_point: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={syncing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition"
                >
                  {syncing ? 'กำลังบันทึก...' : '✅ บันทึกข้อมูลการดูแล'}
                </button>
              </form>

              <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-md border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="font-bold text-slate-800 text-lg">🗂️ ประวัติการดูแลลูกแกะ (Care Logs)</h3>
                  <select
                    value={selectedSheepId}
                    onChange={e => setSelectedSheepId(e.target.value)}
                    className="text-xs border border-slate-200 rounded-xl px-3 py-2 font-semibold bg-white text-slate-800"
                  >
                    <option value="ALL">ดูลูกแกะทั้งหมดในสายดูแล</option>
                    {mySheepList.map(m => (
                      <option key={m.id} value={m.id}>เฉพาะ: {m.nickname}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  {db.careLogs
                    .filter(l => {
                      const inMyScope = mySheepList.some(s => s.id === l.member_id);
                      if (!inMyScope) return false;
                      return selectedSheepId === 'ALL' || l.member_id === selectedSheepId;
                    })
                    .map(log => {
                      const sheep = db.members.find(m => m.id === log.member_id);
                      const mentor = db.members.find(m => m.id === log.mentor_id);
                      const lesson = db.lessons.find(ls => ls.lesson_id === log.lesson_id);

                      return (
                        <div key={log.log_id} className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition bg-slate-50/50">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">
                                🐑 น้อง: {sheep ? sheep.nickname : log.member_id}
                              </span>
                              {sheep && <RoleBadge role={sheep.role} />}
                              <span className="text-xs text-slate-500">
                                (ดูแลโดย: {mentor ? mentor.nickname : log.mentor_id})
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border">
                              📅 {log.date}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {log.activities && log.activities.split(',').map((act, i) => (
                              <span key={i} className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                                {act.trim()}
                              </span>
                            ))}
                            {lesson && (
                              <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                                📖 บทที่ {lesson.chapter_no}: {lesson.title}
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-700">{log.note}</p>
                          {log.prayer_point && (
                            <p className="text-xs text-indigo-600 mt-1.5 font-medium">
                              🙏 อธิษฐานเผื่อ: {log.prayer_point}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 4: คลังบทเรียนออนไลน์
           ===================================================================== */}
        {activeTab === 'lessons' && isLeaderOrMentor(currentUser) && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider bg-white/20 px-3 py-1 rounded-full">
                  📚 Digital Mentor Handbook
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">คลังบทเรียนและคู่มือพี่เลี้ยง</h2>
                <p className="text-sm opacity-95 mt-1">
                  อ่านสรุปเนื้อหา แนวทางคำถามชวนคุย และเปิดดูไฟล์หนังสือ PDF เพื่อเตรียมสอนน้องๆ ได้ทุกที่
                </p>
              </div>
              <button
                onClick={() => setShowAddLessonModal(true)}
                className="px-5 py-3 bg-white text-amber-700 hover:bg-amber-50 font-extrabold text-xs rounded-2xl shadow-md transition shrink-0"
              >
                ➕ เพิ่มบทเรียนใหม่
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {db.lessons.map(lesson => (
                <div key={lesson.lesson_id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                        {lesson.book_name} • บทที่ {lesson.chapter_no}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{lesson.lesson_id}</span>
                    </div>

                    <h3 className="text-xl font-extrabold text-slate-800 mb-2">
                      บทที่ {lesson.chapter_no}: {lesson.title}
                    </h3>

                    <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">
                      <div className="text-xs font-bold text-slate-500 mb-1">📌 เนื้อหาสำคัญโดยสรุป:</div>
                      {lesson.summary}
                    </div>

                    {lesson.mentor_tips && (
                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-sm text-indigo-950 mb-4 whitespace-pre-wrap">
                        <div className="text-xs font-bold text-indigo-600 mb-1">💡 Tips แนะแนวสำหรับพี่เลี้ยง:</div>
                        {lesson.mentor_tips}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                    {lesson.pdf_url && (
                      <a
                        href={lesson.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl text-center shadow-sm transition"
                      >
                        📄 เปิดอ่านไฟล์หนังสือ (PDF)
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setCareForm(prev => ({
                          ...prev,
                          lesson_id: lesson.lesson_id,
                          activities: prev.activities.includes('สอนบทเรียน') ? prev.activities : [...prev.activities, 'สอนบทเรียน']
                        }));
                        setActiveTab('care');
                        showToast(`เลือก "${lesson.title}" เตรียมบันทึกการดูแลแล้ว`);
                      }}
                      className="py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition"
                    >
                      ☑️ สอนบทนี้เสร็จแล้ว (ไปหน้าบันทึก)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}