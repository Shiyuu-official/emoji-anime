import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Download, Plus, Eraser,
    Layout, ZoomIn, ZoomOut, Maximize, Move, Loader2, Image as ImageIcon,
    ChevronLeft, ChevronRight, Search
} from 'lucide-react';

// ======================= 配置与全量映射 =======================
const DEFAULT_BG_PATH = "/background.jpg";

// Emojibase 使用数字 ID 代表分类，我们将它们映射为中文
// 参考: https://emojibase.dev/docs/data/groups
const GROUP_ID_MAP = {
    0: '表情', // Smileys & Emotion
    1: '人物', // People & Body
    3: '动物', // Animals & Nature
    4: '食物', // Food & Drink
    5: '旅行', // Travel & Places
    6: '活动', // Activities
    7: '物品', // Objects
    8: '符号', // Symbols
    9: '旗帜'  // Flags
};

const SORTED_CATEGORIES = [
    '表情', '人物', '动物', '食物', '旅行', '活动', '物品', '符号', '旗帜'
];

// ======================= 子组件：Emoji 按钮 =======================
const EmojiButton = React.memo(({ item, onClick }) => {
    const [loaded, setLoaded] = useState(false);
    const [hasError, setHasError] = useState(false); // 新增错误状态
    const { char, label } = item;

    return (
        <button
            onClick={() => onClick(char)}
            className="aspect-square flex items-center justify-center bg-white hover:bg-slate-50 rounded-lg transition-all hover:scale-110 border border-slate-200 hover:border-blue-400 shadow-sm relative overflow-hidden group"
            title={label}
        >
            {/* 1. 加载前的骨架屏 (没有报错且未加载完成时显示) */}
            {!loaded && !hasError && (
                <div className="absolute inset-0 bg-slate-100 animate-pulse" />
            )}

            {/* 2. 图片或原生文字 */}
            {hasError ? (
                // 加载失败，显示原生 Emoji 字符
                <span className="text-2xl leading-none select-none filter drop-shadow-sm">
                    {char}
                </span>
            ) : (
                // 尝试加载图片
                <img
                    src={`https://emojicdn.elk.sh/${char}?style=apple`}
                    alt={label}
                    loading="lazy"
                    className={`w-3/4 h-3/4 object-contain transition-all duration-300 group-hover:rotate-6 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => {
                        setHasError(true); // 标记出错
                        setLoaded(true);   // 移除骨架屏
                    }}
                />
            )}
        </button>
    );
});
const App = () => {
    // ======================= 状态管理 =======================
    const [backgroundImage, setBackgroundImage] = useState(null);
    const [stickers, setStickers] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [inputText, setInputText] = useState('');

    // Emoji 数据状态
    const [emojiData, setEmojiData] = useState({});
    const [allEmojis, setAllEmojis] = useState([]);
    const [activeCategory, setActiveCategory] = useState('表情');
    const [isEmojiLoading, setIsEmojiLoading] = useState(true);

    // 搜索状态
    const [emojiSearch, setEmojiSearch] = useState('');

    const [useTemplate, setUseTemplate] = useState(false);
    const [loadingImages, setLoadingImages] = useState(new Set());

    // 视图变换
    const [viewTransform, setViewTransform] = useState({ scale: 1, x: 0, y: 0 });

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const categoryRef = useRef(null);

    // 交互状态
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState('none');
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialStickerState, setInitialStickerState] = useState(null);

    // ================= 初始化 =================
    useEffect(() => {
        document.fonts.load('1rem "Inter"');
        const img = new Image();
        img.src = DEFAULT_BG_PATH;
        img.onload = () => { setBackgroundImage(img); setUseTemplate(false); };
        img.onerror = () => { setUseTemplate(true); };
        fetchEmojiData();
    }, []);

    // [核心修改] 加载中文 Emoji 数据
    const fetchEmojiData = async () => {
        setIsEmojiLoading(true);
        try {
            // 使用 emojibase 的中文数据源 (包含 label 和 tags)
            const response = await fetch('https://unpkg.com/emojibase-data@latest/zh/data.json');
            const data = await response.json();

            const processedData = {};
            const flatList = [];

            // 初始化所有分类数组
            Object.values(GROUP_ID_MAP).forEach(name => {
                processedData[name] = [];
            });

            data.forEach(item => {
                // item 结构: { emoji: "😀", group: 0, label: "笑脸", tags: ["开心", "笑"] }
                if (GROUP_ID_MAP.hasOwnProperty(item.group)) {
                    const catName = GROUP_ID_MAP[item.group];

                    const emojiItem = {
                        char: item.emoji,
                        label: item.label, // 中文名称
                        tags: item.tags || [] // 中文关键字
                    };

                    if (processedData[catName]) {
                        processedData[catName].push(emojiItem);
                    }
                    flatList.push(emojiItem);
                }
            });

            setEmojiData(processedData);
            setAllEmojis(flatList);
        } catch (error) {
            console.error("Emoji load failed", error);
        } finally {
            setIsEmojiLoading(false);
        }
    };

    // [核心修改] 中文智能搜索逻辑
    const displayEmojis = useMemo(() => {
        if (!emojiSearch.trim()) {
            return emojiData[activeCategory] || [];
        }
        const lowerSearch = emojiSearch.toLowerCase();

        return allEmojis.filter(item => {
            // 1. 匹配中文名称 (Label)
            if (item.label && item.label.includes(lowerSearch)) return true;

            // 2. 匹配中文标签 (Tags) - 这使得搜"开心"能出"笑脸"
            if (item.tags && item.tags.some(tag => tag.includes(lowerSearch))) return true;

            return false;
        });
    }, [emojiSearch, activeCategory, emojiData, allEmojis]);

    useEffect(() => {
        requestAnimationFrame(drawCanvas);
    }, [backgroundImage, stickers, selectedId, useTemplate]);

    // ================= 坐标转换与核心逻辑 (不变) =================
    const mapScreenToCanvas = (screenX, screenY) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 1200 / 2, y: 1200 / 2 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (screenX - rect.left) * scaleX,
            y: (screenY - rect.top) * scaleY
        };
    };

    const scrollCategories = (direction) => {
        if (categoryRef.current) {
            const scrollAmount = 150;
            categoryRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const addSticker = useCallback((content, useAppleImage = false) => {
        const id = Date.now();
        let startX, startY;

        if (containerRef.current && canvasRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const centerX = containerRect.left + containerRect.width / 2;
            const centerY = containerRect.top + containerRect.height / 2;
            const pos = mapScreenToCanvas(centerX, centerY);
            startX = pos.x;
            startY = pos.y;
        } else {
            startX = 1200 / 2;
            startY = 1200 / 2;
        }

        startX += (Math.random() - 0.5) * 60;
        startY += (Math.random() - 0.5) * 60;

        const newSticker = {
            id: id,
            content: content,
            type: useAppleImage ? 'image' : 'text',
            imageObj: null,
            x: startX,
            y: startY,
            size: 150,
            rotation: 0,
            isLoading: useAppleImage
        };

        setStickers(prev => [...prev, newSticker]);
        setSelectedId(id);

        if (useAppleImage) {
            setLoadingImages(prev => new Set(prev).add(id));
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = `https://emojicdn.elk.sh/${content}?style=apple`;
            img.onload = () => {
                setStickers(prev => prev.map(s => s.id === id ? { ...s, imageObj: img, isLoading: false } : s));
                setLoadingImages(prev => { const next = new Set(prev); next.delete(id); return next; });
            };
            img.onerror = () => {
                setStickers(prev => prev.map(s => s.id === id ? { ...s, type: 'text', isLoading: false } : s));
                setLoadingImages(prev => { const next = new Set(prev); next.delete(id); return next; });
            };
        }
    }, []);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => { setBackgroundImage(img); setUseTemplate(false); };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const deleteSticker = () => {
        if (selectedId) {
            setStickers(prev => prev.filter(s => s.id !== selectedId));
            setSelectedId(null);
        }
    };

    const resetView = () => {
        setViewTransform({ scale: 1, x: 0, y: 0 });
    };

    // ================= Canvas 绘图 =================
    const drawTemplateBackground = (ctx, width, height) => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
        const cols = 4; const rows = 4;
        const cellWidth = width / cols; const cellHeight = height / rows;
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
        for (let i = 1; i <= cols; i++) { ctx.beginPath(); ctx.moveTo(i * cellWidth, 0); ctx.lineTo(i * cellWidth, height); ctx.stroke(); }
        for (let i = 1; i <= rows; i++) { ctx.beginPath(); ctx.moveTo(0, i * cellHeight); ctx.lineTo(width, i * cellHeight); ctx.stroke(); }
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const logicalSize = 1200;

        let targetWidth = logicalSize;
        let targetHeight = logicalSize;

        if (!useTemplate && backgroundImage) {
            const ratio = backgroundImage.width / backgroundImage.height;
            if (ratio > 1) targetHeight = targetWidth / ratio;
            else targetWidth = targetHeight * ratio;
        }

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (useTemplate) {
            drawTemplateBackground(ctx, canvas.width, canvas.height);
        } else if (backgroundImage) {
            ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        stickers.forEach(sticker => {
            if (sticker.isLoading) return;

            ctx.save();
            ctx.translate(sticker.x, sticker.y);
            ctx.rotate((sticker.rotation * Math.PI) / 180);

            if (sticker.type === 'image' && sticker.imageObj) {
                try {
                    ctx.shadowColor = 'rgba(0,0,0,0.15)';
                    ctx.shadowBlur = 12;
                    ctx.shadowOffsetY = 4;
                    ctx.drawImage(sticker.imageObj, -sticker.size / 2, -sticker.size / 2, sticker.size, sticker.size);
                    ctx.shadowColor = 'transparent';
                } catch (e) {}
            } else {
                ctx.font = `${sticker.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#000';
                ctx.fillText(sticker.content, 0, 0);
            }

            if (selectedId === sticker.id) {
                const boxSize = sticker.size + 20;
                const half = boxSize / 2;

                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 6]);
                ctx.strokeRect(-half, -half, boxSize, boxSize);
                ctx.setLineDash([]);

                const handleRadius = 14;
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath(); ctx.arc(half, half, handleRadius, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'white'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.arc(half, half, 6.5, 0, Math.PI * 1.5); ctx.stroke();
                ctx.fillStyle = 'white'; ctx.beginPath(); ctx.moveTo(half - 1, half - 6.5 - 4); ctx.lineTo(half + 5, half - 6.5); ctx.lineTo(half - 1, half - 6.5 + 4); ctx.fill();

                ctx.fillStyle = '#ef4444';
                ctx.beginPath(); ctx.arc(-half, -half, handleRadius, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'white'; ctx.lineWidth = 2.5;
                ctx.beginPath();
                const xOffset = 4; ctx.moveTo(-half - xOffset, -half - xOffset); ctx.lineTo(-half + xOffset, -half + xOffset); ctx.moveTo(-half + xOffset, -half - xOffset); ctx.lineTo(-half - xOffset, -half + xOffset); ctx.stroke();
            }
            ctx.restore();
        });
    };

    // ================= 交互事件 =================
    const handleWheel = (e) => {
        const delta = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.1, viewTransform.scale + delta), 5);
        setViewTransform(prev => ({ ...prev, scale: newScale }));
    };

    const handlePointerDown = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const { x, y } = mapScreenToCanvas(clientX, clientY);

        if (selectedId) {
            const s = stickers.find(st => st.id === selectedId);
            if (s) {
                const halfSize = (s.size + 20) / 2;
                const rad = (s.rotation * Math.PI) / 180;
                const cos = Math.cos(rad); const sin = Math.sin(rad);
                const scaleX = s.x + (halfSize * cos - halfSize * sin);
                const scaleY = s.y + (halfSize * sin + halfSize * cos);
                const delX = s.x + (-halfSize * cos - -halfSize * sin);
                const delY = s.y + (-halfSize * sin + -halfSize * cos);

                const TOUCH_RADIUS = 30;
                if (Math.hypot(x - delX, y - delY) < TOUCH_RADIUS) { deleteSticker(); return; }
                if (Math.hypot(x - scaleX, y - scaleY) < TOUCH_RADIUS) {
                    setIsDragging(true); setDragMode('scale_rotate');
                    setInitialStickerState({ ...s }); setDragStart({ x, y }); return;
                }
            }
        }

        let clickedId = null;
        for (let i = stickers.length - 1; i >= 0; i--) {
            const s = stickers[i];
            if (Math.hypot(x - s.x, y - s.y) < s.size / 2 + 10) { clickedId = s.id; break; }
        }

        if (clickedId) {
            setSelectedId(clickedId); setIsDragging(true); setDragMode('move');
            setDragStart({ x, y });
        } else {
            setSelectedId(null); setIsDragging(true); setDragMode('pan');
            setDragStart({ x: clientX, y: clientY });
        }
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const canvasCoords = mapScreenToCanvas(clientX, clientY);

        if (dragMode === 'move' && selectedId) {
            const dx = canvasCoords.x - dragStart.x;
            const dy = canvasCoords.y - dragStart.y;
            setStickers(prev => prev.map(s => s.id === selectedId ? { ...s, x: s.x + dx, y: s.y + dy } : s));
            setDragStart({ x: canvasCoords.x, y: canvasCoords.y });
        } else if (dragMode === 'scale_rotate' && selectedId) {
            const s = stickers.find(st => st.id === selectedId);
            const centerX = s.x; const centerY = s.y;
            const currentAngle = Math.atan2(canvasCoords.y - centerY, canvasCoords.x - centerX);
            const startAngle = Math.atan2(dragStart.y - centerY, dragStart.x - centerX);
            const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
            const startDist = Math.hypot(dragStart.x - centerX, dragStart.y - centerY);
            const currentDist = Math.hypot(canvasCoords.x - centerX, canvasCoords.y - centerY);
            const scaleRatio = currentDist / startDist;

            setStickers(prev => prev.map(sticker => {
                if (sticker.id === selectedId) {
                    return {
                        ...sticker,
                        rotation: initialStickerState.rotation + deltaAngle,
                        size: Math.max(40, Math.min(800, initialStickerState.size * scaleRatio))
                    };
                }
                return sticker;
            }));
        } else if (dragMode === 'pan') {
            const dx = clientX - dragStart.x;
            const dy = clientY - dragStart.y;
            setViewTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setDragStart({ x: clientX, y: clientY });
        }
    };

    const handlePointerUp = () => { setIsDragging(false); setDragMode('none'); };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const currentSelected = selectedId;
        setSelectedId(null);
        setTimeout(() => {
            const link = document.createElement('a');
            link.download = `Anime_Life_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            setSelectedId(currentSelected);
        }, 50);
    };

    const clearAll = () => {
        if (window.confirm("确定要清空吗？")) {
            setStickers([]); setSelectedId(null); setViewTransform({ scale: 1, x: 0, y: 0 });
        }
    };

    const getCursorStyle = () => {
        if (dragMode === 'pan') return 'grabbing';
        if (dragMode !== 'none') return 'default';
        if (selectedId) return 'default';
        return 'grab';
    };

    return (
        <div className="h-[100dvh] w-full bg-slate-50 text-slate-700 flex flex-col font-sans overflow-hidden">

            <header className="h-16 px-4 md:px-6 bg-white/70 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shrink-0 z-20 shadow-sm relative">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 text-white rounded-lg shadow-md shadow-blue-500/30">
                        <Layout size={20} />
                    </div>
                    <h1 className="font-bold text-lg md:text-xl tracking-tight text-slate-800">动画生涯喜好表</h1>
                </div>

                <div className="hidden md:flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 absolute left-1/2 -translate-x-1/2 shadow-sm">
                    <button onClick={() => setViewTransform(p => ({...p, scale: Math.max(0.1, p.scale - 0.1)}))} className="p-1.5 hover:bg-white rounded-md text-slate-500 transition-colors"><ZoomOut size={16} /></button>
                    <span className="text-xs font-mono w-12 text-center text-slate-600 select-none">{Math.round(viewTransform.scale * 100)}%</span>
                    <button onClick={() => setViewTransform(p => ({...p, scale: Math.min(5, p.scale + 0.1)}))} className="p-1.5 hover:bg-white rounded-md text-slate-500 transition-colors"><ZoomIn size={16} /></button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <button onClick={resetView} className="p-1.5 hover:bg-white rounded-md text-slate-500 transition-colors tooltip flex items-center gap-1" title="重置视图">
                        <Maximize size={16} />
                        { (viewTransform.x !== 0 || viewTransform.y !== 0) && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> }
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={clearAll} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Eraser size={20} /></button>
                    <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 hover:-translate-y-0.5"><Download size={18} /><span className="hidden sm:inline">保存</span></button>
                </div>
            </header>

            <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

                <div
                    ref={containerRef}
                    className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center"
                    style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px', cursor: getCursorStyle() }}
                    onWheel={handleWheel}
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                >
                    <canvas
                        ref={canvasRef}
                        className="bg-white shadow-2xl shadow-slate-300/50 touch-none origin-center transition-transform duration-75 ease-out"
                        style={{ transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`, maxWidth: 'none', maxHeight: 'none', pointerEvents: 'none' }}
                    />
                </div>

                <aside className="w-full md:w-80 lg:w-96 bg-white/80 backdrop-blur-xl border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0 h-[40vh] md:h-auto z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                    <div className="p-4 pb-0">
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button className="flex-1 py-1.5 text-xs font-bold text-slate-700 bg-white rounded-lg shadow-sm ring-1 ring-black/5">贴纸库</button>
                            <label className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg cursor-pointer text-center transition-all">
                                更换背景
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>

                    <div className="px-4 py-4 border-b border-slate-100 space-y-3">
                        <div className="flex gap-2">
                            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && inputText && (addSticker(inputText, false), setInputText(''))} placeholder="输入文字..." className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none" />
                            <button onClick={() => inputText && (addSticker(inputText, false), setInputText(''))} className="px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md"><Plus size={20} /></button>
                        </div>

                        {/* [新增] 中文 Emoji 搜索框 */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={emojiSearch}
                                onChange={(e) => setEmojiSearch(e.target.value)}
                                placeholder="搜索 Emoji (如: 开心, 猫)"
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* 分类栏 */}
                    {!emojiSearch && (
                        <div className="relative border-b border-slate-100 flex items-center bg-white/50 backdrop-blur-sm">
                            <button onClick={() => scrollCategories('left')} className="absolute left-0 z-10 p-2 bg-gradient-to-r from-white via-white to-transparent hover:text-blue-500 text-slate-400 h-full flex items-center justify-center"><ChevronLeft size={18} /></button>
                            <div ref={categoryRef} className="flex overflow-x-auto no-scrollbar px-8 gap-1 w-full scroll-smooth" onWheel={(e) => { e.stopPropagation(); if (categoryRef.current) categoryRef.current.scrollLeft += e.deltaY; }}>
                                {SORTED_CATEGORIES.map(cat => (
                                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap shrink-0 ${activeCategory === cat ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => scrollCategories('right')} className="absolute right-0 z-10 p-2 bg-gradient-to-l from-white via-white to-transparent hover:text-blue-500 text-slate-400 h-full flex items-center justify-center"><ChevronRight size={18} /></button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
                        {isEmojiLoading ? (
                            <div className="h-full flex items-center justify-center text-slate-400 gap-2">
                                <Loader2 className="animate-spin" /> 加载中文资源库...
                            </div>
                        ) : (
                            <div className="grid grid-cols-5 gap-3">
                                {(displayEmojis.length > 0) ? displayEmojis.map((item, idx) => (
                                    <EmojiButton
                                        key={`${item.char}-${idx}`}
                                        item={item}
                                        onClick={(char) => addSticker(char, true)}
                                    />
                                )) : (
                                    <div className="col-span-5 text-center text-slate-400 py-8 text-sm">
                                        未找到匹配的 Emoji 🫠
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="h-10"></div>
                    </div>
                </aside>
            </main>

            {loadingImages.size > 0 && (
                <div className="absolute bottom-6 left-6 px-4 py-2 bg-white/90 backdrop-blur rounded-full border border-slate-200 text-xs text-blue-600 flex items-center gap-2 z-50 animate-pulse shadow-xl ring-1 ring-black/5">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                    正在加载资源...
                </div>
            )}
        </div>
    );
};

export default App;
