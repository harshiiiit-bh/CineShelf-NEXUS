import React, { useState, useCallback, useEffect } from 'react';
import { useNexus } from '../context/NexusContext';
import {
  CharacterAppearance,
  CharacterGender,
  CharacterHairId,
  CharacterOutfitId,
  CharacterAccessoryId,
  FacialHairStyleId,
  HeadwearId,
  UpperBodyId,
  LowerBodyId,
  FootwearId,
  FunnyCosmeticId,
  MaterialFinishType,
  CharacterAnimationState,
  CharacterOutfitPreset,
} from '../types/nexus';
import { Character3DStudioCanvas, StudioViewPreset } from './Character3DStudioCanvas';
import {
  User,
  UserCheck,
  Sparkles,
  Scissors,
  Shirt,
  Glasses,
  Smile,
  Save,
  RotateCcw,
  Shuffle,
  Play,
  ArrowRight,
  Check,
  Palette,
  Layers,
  Award,
  Crown,
  Tv,
  Zap,
  Bookmark,
  Trash2,
} from 'lucide-react';

type CustomizationTab = 'gender_body' | 'face_hair' | 'wardrobe' | 'accessories' | 'fun_stuff' | 'saved_outfits';

const SKIN_TONES = [
  { id: '#FEF3C7', label: 'Light Ivory' },
  { id: '#FCD34D', label: 'Warm Beige' },
  { id: '#FBBF24', label: 'Golden Honey' },
  { id: '#F59E0B', label: 'Warm Bronze' },
  { id: '#D97706', label: 'Rich Chestnut' },
  { id: '#B45309', label: 'Deep Amber' },
  { id: '#78350F', label: 'Dark Ebony' },
];

const HAIR_COLORS = [
  { id: '#1E1B4B', label: 'Midnight Black' },
  { id: '#18181B', label: 'Dark Charcoal' },
  { id: '#78350F', label: 'Espresso Brown' },
  { id: '#B45309', label: 'Warm Chestnut' },
  { id: '#D97706', label: 'Golden Blonde' },
  { id: '#F59E0B', label: 'Platinum Blonde' },
  { id: '#E11D48', label: 'Crimson Red' },
  { id: '#2563EB', label: 'Cyber Sapphire' },
  { id: '#10B981', label: 'Neon Emerald' },
  { id: '#A855F7', label: 'Royal Violet' },
];

const EYE_COLORS = [
  { id: '#0F172A', label: 'Obsidian Black' },
  { id: '#1E3A8A', label: 'Deep Blue' },
  { id: '#065F46', label: 'Emerald Green' },
  { id: '#92400E', label: 'Warm Hazel' },
  { id: '#4C1D95', label: 'Mystic Amethyst' },
];

const TOP_COLORS = [
  { id: '#3B82F6', label: 'Royal Blue' },
  { id: '#EF4444', label: 'Crimson Red' },
  { id: '#10B981', label: 'Emerald Green' },
  { id: '#F59E0B', label: 'Amber Gold' },
  { id: '#8B5CF6', label: 'Purple Velvet' },
  { id: '#EC4899', label: 'Neon Pink' },
  { id: '#0F172A', label: 'Stealth Black' },
  { id: '#F8FAFC', label: 'Pure White' },
];

const PANTS_COLORS = [
  { id: '#1E293B', label: 'Midnight Navy' },
  { id: '#0F172A', label: 'Classic Black' },
  { id: '#334155', label: 'Slate Grey' },
  { id: '#1E3A8A', label: 'Deep Denim Blue' },
  { id: '#78350F', label: 'Khaki Tan' },
  { id: '#475569', label: 'Charcoal Grey' },
];

const SHOES_COLORS = [
  { id: '#0F172A', label: 'Black Leather' },
  { id: '#F8FAFC', label: 'Pure White' },
  { id: '#78350F', label: 'Brown Leather' },
  { id: '#3B82F6', label: 'Cyber Blue' },
  { id: '#EF4444', label: 'Red Accent' },
];

const BUILTIN_OUTFIT_PRESETS: CharacterOutfitPreset[] = [
  {
    id: 'preset_casual_movie',
    name: 'Casual Movie Night',
    category: 'casual',
    description: 'Ultra-comfortable street hoodie, joggers, and fresh sneakers ready for popcorn.',
    appearance: {
      gender: 'male',
      style: 'modern_casual',
      hairStyle: 'spiky',
      outfit: 'hoodie_denim',
      upperBody: 'hoodie_street',
      lowerBody: 'joggers_street',
      footwear: 'sneakers_fresh',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E293B',
      topColor: '#3B82F6',
      pantsColor: '#1E293B',
      shoesColor: '#0F172A',
      skinTone: '#F59E0B',
      hairColor: '#18181B',
      eyeColor: '#0F172A',
      accessory: '3d_glasses',
      displayName: 'Cinephile',
    },
  },
  {
    id: 'preset_luxury_vip',
    name: 'Luxury VIP Cinema',
    category: 'luxury',
    description: 'Tailored velvet blazer, formal trousers, gold headset, and polished oxfords.',
    appearance: {
      gender: 'female',
      style: 'classic_cinema',
      hairStyle: 'bun_classic',
      outfit: 'vip_blazer',
      upperBody: 'suit_jacket',
      lowerBody: 'pants_formal',
      footwear: 'shoes_oxford',
      primaryColor: '#8B5CF6',
      secondaryColor: '#0F172A',
      topColor: '#8B5CF6',
      pantsColor: '#0F172A',
      shoesColor: '#0F172A',
      skinTone: '#FCD34D',
      hairColor: '#1E1B4B',
      eyeColor: '#1E3A8A',
      accessory: 'gold_headset',
      displayName: 'Cinephile VIP',
    },
  },
  {
    id: 'preset_gentleman_clown',
    name: 'The Gentleman Clown',
    category: 'funny',
    description: 'Giant curled moustache, spectacles sitting on TOP of the head, and top hat.',
    appearance: {
      gender: 'male',
      style: 'cartoon_stylised',
      hairStyle: 'short_crop',
      outfit: 'tuxedo',
      upperBody: 'suit_jacket',
      lowerBody: 'pants_formal',
      footwear: 'slippers_funny',
      primaryColor: '#EF4444',
      secondaryColor: '#0F172A',
      topColor: '#EF4444',
      pantsColor: '#0F172A',
      shoesColor: '#F8FAFC',
      skinTone: '#FEF3C7',
      hairColor: '#B45309',
      eyeColor: '#0F172A',
      headwear: 'giant_top_hat',
      facialHair: 'oversized_moustache',
      funnyCosmetic: 'glasses_on_head',
      accessory: 'none',
      displayName: 'Gentleman Clown',
    },
  },
  {
    id: 'preset_cyber_spectator',
    name: 'Cyberpunk Spectator',
    category: 'futuristic',
    description: 'Cyber undercut, glowing neon visor, futuristic jacket, and emerald highlights.',
    appearance: {
      gender: 'male',
      style: 'futuristic_cyber',
      hairStyle: 'cyber_undercut',
      outfit: 'cyber_hoodie',
      upperBody: 'tee_oversized',
      lowerBody: 'cargo_pants',
      footwear: 'sneakers_fresh',
      primaryColor: '#10B981',
      secondaryColor: '#0F172A',
      topColor: '#10B981',
      pantsColor: '#0F172A',
      shoesColor: '#3B82F6',
      skinTone: '#FBBF24',
      hairColor: '#2563EB',
      hairHighlights: '#10B981',
      eyeColor: '#065F46',
      accessory: 'cyber_visor',
      displayName: 'Cyber Cinephile',
    },
  },
  {
    id: 'preset_celestial',
    name: 'Celestial Cinephile',
    category: 'party',
    description: 'Floating glowing halo, golden crown, white outfit, and orbiting stars.',
    appearance: {
      gender: 'female',
      style: 'stylised_game',
      hairStyle: 'long_flowing',
      outfit: 'tuxedo_velvet',
      upperBody: 'cozy_sweater',
      lowerBody: 'pants_formal',
      footwear: 'shoes_oxford',
      primaryColor: '#F8FAFC',
      secondaryColor: '#F59E0B',
      topColor: '#F8FAFC',
      pantsColor: '#F59E0B',
      shoesColor: '#F8FAFC',
      skinTone: '#FEF3C7',
      hairColor: '#F59E0B',
      eyeColor: '#1E3A8A',
      accessory: 'none',
      funnyCosmetic: 'floating_halo',
      displayName: 'Angel Cinephile',
    },
  },
];

export const CharacterStudioView: React.FC = () => {
  const { account, setActiveSection, addToast } = useNexus();

  // Active customization tab
  const [activeTab, setActiveTab] = useState<CustomizationTab>('gender_body');

  // Active Appearance State
  const [appearance, setAppearance] = useState<CharacterAppearance>(() => {
    try {
      const saved = localStorage.getItem('nexus_saved_character_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return BUILTIN_OUTFIT_PRESETS[0].appearance;
  });

  // Saved Outfits List
  const [savedOutfits, setSavedOutfits] = useState<CharacterOutfitPreset[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_saved_outfits_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return BUILTIN_OUTFIT_PRESETS;
  });

  const [newOutfitName, setNewOutfitName] = useState('');
  const [activeAnimation, setActiveAnimation] = useState<CharacterAnimationState>('idle');
  const [viewPreset, setViewPreset] = useState<StudioViewPreset>('front');

  // Handle patch of appearance properties
  const patchAppearance = useCallback((updates: Partial<CharacterAppearance>) => {
    setAppearance((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('nexus_saved_character_v2', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Save Character & Outfit to account/localStorage
  const handleSaveCharacter = () => {
    try {
      localStorage.setItem('nexus_saved_character_v2', JSON.stringify(appearance));
      if (typeof addToast === 'function') {
        addToast('Character appearance saved! Active in 3D Cinema.', 'info');
      }
    } catch {
      // ignore
    }
  };

  // Save Current Appearance as a new Custom Outfit Preset
  const handleSaveOutfitPreset = () => {
    const name = newOutfitName.trim() || `My Outfit #${savedOutfits.length + 1}`;
    const newPreset: CharacterOutfitPreset = {
      id: `outfit_${Date.now()}`,
      name,
      category: 'casual',
      description: 'Custom user wardrobe configuration.',
      appearance: { ...appearance, savedOutfitName: name },
    };
    const updated = [newPreset, ...savedOutfits];
    setSavedOutfits(updated);
    setNewOutfitName('');
    try {
      localStorage.setItem('nexus_saved_outfits_v2', JSON.stringify(updated));
      if (typeof addToast === 'function') {
        addToast(`Outfit "${name}" saved to your Wardrobe!`, 'info');
      }
    } catch {
      // ignore
    }
  };

  // Delete saved outfit
  const handleDeleteOutfit = (id: string) => {
    const updated = savedOutfits.filter((o) => o.id !== id);
    setSavedOutfits(updated);
    try {
      localStorage.setItem('nexus_saved_outfits_v2', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Randomize Character Appearance
  const handleRandomize = () => {
    const isFemale = Math.random() > 0.5;
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].id;
    const randomHair = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id;
    const randomTop = TOP_COLORS[Math.floor(Math.random() * TOP_COLORS.length)].id;
    const randomPants = PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)].id;

    const hairstyles: CharacterHairId[] = ['short_crop', 'spiky', 'cyber_undercut', 'bun_classic', 'long_flowing', 'afro', 'mohawk', 'ponytail'];
    const facialHairs: FacialHairStyleId[] = ['clean_shaven', 'stubble', 'full_beard', 'handlebar_moustache', 'oversized_moustache', 'wizard_beard'];
    const headwears: HeadwearId[] = ['none', 'cap_baseball', 'cowboy_hat', 'top_hat', 'crown_royal', 'tiny_hat', 'giant_top_hat'];
    const funnyCosmetics: FunnyCosmeticId[] = ['none', 'glasses_on_head', 'clown_nose', 'oversized_ears', 'floating_halo', 'floating_crown', 'floating_stars', 'novelty_antennas'];

    patchAppearance({
      gender: isFemale ? 'female' : 'male',
      skinTone: randomSkin,
      hairColor: randomHair,
      topColor: randomTop,
      pantsColor: randomPants,
      hairStyle: hairstyles[Math.floor(Math.random() * hairstyles.length)],
      facialHair: facialHairs[Math.floor(Math.random() * facialHairs.length)],
      headwear: headwears[Math.floor(Math.random() * headwears.length)],
      funnyCosmetic: funnyCosmetics[Math.floor(Math.random() * funnyCosmetics.length)],
    });

    if (typeof addToast === 'function') {
      addToast('Randomized character appearance!', 'info');
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] bg-slate-950 text-slate-100 flex flex-col p-4 md:p-6 gap-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-display">
                3D CHARACTER STUDIO
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                AVATAR ENGINE 3.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Customize your virtual 3D avatar identity for the CineShelf 3D Cinema & Watch Together rooms.
            </p>
          </div>
        </div>

        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleRandomize}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            title="Randomize character appearance"
          >
            <Shuffle className="w-4 h-4 text-amber-400" />
            <span>Randomize</span>
          </button>

          <button
            onClick={handleSaveCharacter}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Character</span>
          </button>

          <button
            onClick={() => {
              handleSaveCharacter();
              setActiveSection('watch_together');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all"
          >
            <Tv className="w-4 h-4" />
            <span>Enter 3D Cinema</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* ============================================================================
            LEFT PANEL: CATEGORY NAVIGATION TABS (Col Span 3)
           ============================================================================ */}
        <div className="lg:col-span-3 flex flex-col gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl backdrop-blur-md">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
            Customization Categories
          </div>

          <div className="flex flex-col gap-1.5">
            {[
              { id: 'gender_body', label: 'Gender & Body', icon: User, badge: 'Base' },
              { id: 'face_hair', label: 'Face & Hair', icon: Scissors, badge: 'Style' },
              { id: 'wardrobe', label: 'Wardrobe & Outfit', icon: Shirt, badge: 'Fashion' },
              { id: 'accessories', label: 'Accessories & Eyewear', icon: Glasses, badge: 'Gear' },
              { id: 'fun_stuff', label: 'Fun Stuff Cosmetics', icon: Smile, badge: 'Funny' },
              { id: 'saved_outfits', label: 'Saved Wardrobe', icon: Bookmark, badge: 'Presets' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as CustomizationTab)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Active Appearance Summary Card */}
          <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col gap-2 text-xs">
            <span className="font-semibold text-slate-300">Active Look Summary</span>
            <div className="flex items-center justify-between text-slate-400">
              <span>Gender:</span>
              <span className="font-semibold text-amber-400 capitalize">{appearance.gender || 'male'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Hairstyle:</span>
              <span className="font-semibold text-slate-200 capitalize">{appearance.hairStyle.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Funny Item:</span>
              <span className="font-semibold text-rose-400 capitalize">
                {appearance.funnyCosmetic ? appearance.funnyCosmetic.replace('_', ' ') : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================================
            CENTER PANEL: 3D INTERACTIVE VIEWPORT (Col Span 5)
           ============================================================================ */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="h-[540px] w-full">
            <Character3DStudioCanvas
              appearance={appearance}
              activeAnimation={activeAnimation}
              viewPreset={viewPreset}
              onViewPresetChange={(preset) => setViewPreset(preset)}
            />
          </div>

          {/* Animation Preview Controller Bar */}
          <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-2xl backdrop-blur-md flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Character Animations</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase">Interactive Rig</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'idle', label: 'Idle' },
                { id: 'walking', label: 'Walk' },
                { id: 'running', label: 'Run' },
                { id: 'jumping', label: 'Jump' },
                { id: 'wave', label: 'Wave' },
                { id: 'sitting', label: 'Sit' },
                { id: 'eating_popcorn', label: 'Popcorn' },
                { id: 'drinking', label: 'Soda' },
                { id: 'laughing', label: 'Laugh' },
                { id: 'celebrating', label: 'Celebrate' },
              ].map((anim) => (
                <button
                  key={anim.id}
                  onClick={() => setActiveAnimation(anim.id as CharacterAnimationState)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeAnimation === anim.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================================
            RIGHT PANEL: CUSTOMIZATION CONTROLS & WARDROBE CARDS (Col Span 4)
           ============================================================================ */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-slate-900/70 border border-slate-800 p-4 rounded-2xl backdrop-blur-md max-h-[640px] overflow-y-auto">
          {/* TAB 1: GENDER & BODY */}
          {activeTab === 'gender_body' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>Gender Presentation & Body Model</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'male', label: 'Male Model', desc: 'Broader shoulders & athletic torso' },
                  { id: 'female', label: 'Female Model', desc: 'Slender silhouette & defined waist' },
                ].map((g) => {
                  const isSelected = (appearance.gender || 'male') === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => patchAppearance({ gender: g.id as CharacterGender })}
                      className={`p-3.5 rounded-xl border flex flex-col items-start gap-1 text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs">{g.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400">{g.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Skin Tone Palette Selector */}
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>Skin Tone Selection</span>
                </label>

                <div className="grid grid-cols-7 gap-2">
                  {SKIN_TONES.map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => patchAppearance({ skinTone: tone.id })}
                      className={`w-full h-8 rounded-xl border-2 transition-all ${
                        appearance.skinTone === tone.id ? 'border-amber-400 scale-110 shadow-lg' : 'border-slate-700 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: tone.id }}
                      title={tone.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FACE & HAIR */}
          {activeTab === 'face_hair' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" />
                <span>Hairstyle & Facial Hair</span>
              </h3>

              {/* Hairstyles Grid */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-300">Hairstyle Selection</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'short_crop', label: 'Short Crop' },
                    { id: 'spiky', label: 'Spiky Spikes' },
                    { id: 'cyber_undercut', label: 'Cyber Undercut' },
                    { id: 'bun_classic', label: 'Classic Bun' },
                    { id: 'long_flowing', label: 'Long Flowing' },
                    { id: 'afro', label: 'Afro Volume' },
                    { id: 'mohawk', label: 'Punk Mohawk' },
                    { id: 'ponytail', label: 'High Ponytail' },
                  ].map((hair) => (
                    <button
                      key={hair.id}
                      onClick={() => patchAppearance({ hairStyle: hair.id as CharacterHairId })}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                        appearance.hairStyle === hair.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      {hair.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hair Colors */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-300">Hair Color</span>
                <div className="grid grid-cols-5 gap-2">
                  {HAIR_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => patchAppearance({ hairColor: color.id })}
                      className={`h-7 rounded-lg border-2 transition-all ${
                        appearance.hairColor === color.id ? 'border-amber-400 scale-110' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: color.id }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Facial Hair / Beards & Moustaches */}
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-xs font-semibold text-slate-300">Beard & Moustache Style</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'clean_shaven', label: 'Clean Shaven' },
                    { id: 'stubble', label: 'Subtle Stubble' },
                    { id: 'full_beard', label: 'Full Beard' },
                    { id: 'handlebar_moustache', label: 'Handlebar' },
                    { id: 'oversized_moustache', label: 'Giant Moustache' },
                    { id: 'wizard_beard', label: 'Wizard Beard' },
                  ].map((beard) => (
                    <button
                      key={beard.id}
                      onClick={() => patchAppearance({ facialHair: beard.id as FacialHairStyleId })}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                        appearance.facialHair === beard.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      {beard.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WARDROBE & OUTFIT */}
          {activeTab === 'wardrobe' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Shirt className="w-4 h-4 text-amber-400" />
                <span>Wardrobe & Clothing Selection</span>
              </h3>

              {/* Upper Body Clothes */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-300">Upper Body Garment</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'hoodie_street', label: 'Street Hoodie' },
                    { id: 'suit_jacket', label: 'Tailored Blazer' },
                    { id: 'leather_jacket', label: 'Leather Jacket' },
                    { id: 'cozy_sweater', label: 'Cozy Sweater' },
                    { id: 'tee_casual', label: 'Casual T-Shirt' },
                    { id: 'jersey_sports', label: 'Sports Jersey' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => patchAppearance({ upperBody: item.id as UpperBodyId })}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                        appearance.upperBody === item.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Color Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-300">Top Garment Color</span>
                <div className="grid grid-cols-4 gap-2">
                  {TOP_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => patchAppearance({ topColor: c.id, primaryColor: c.id })}
                      className={`h-7 rounded-lg border-2 transition-all ${
                        appearance.topColor === c.id ? 'border-amber-400 scale-105' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: c.id }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Pants & Lower Body */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-300">Pants & Bottoms</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'joggers_street', label: 'Street Joggers' },
                    { id: 'pants_formal', label: 'Formal Trousers' },
                    { id: 'cargo_pants', label: 'Cargo Pants' },
                    { id: 'shorts_casual', label: 'Casual Shorts' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => patchAppearance({ lowerBody: item.id as LowerBodyId })}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                        appearance.lowerBody === item.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footwear */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-300">Footwear</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'sneakers_fresh', label: 'Fresh Sneakers' },
                    { id: 'shoes_oxford', label: 'Oxford Shoes' },
                    { id: 'boots_leather', label: 'Leather Boots' },
                    { id: 'slippers_funny', label: 'Funny Slippers' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => patchAppearance({ footwear: item.id as FootwearId })}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                        appearance.footwear === item.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACCESSORIES & EYEWEAR */}
          {activeTab === 'accessories' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Glasses className="w-4 h-4 text-amber-400" />
                <span>Accessories & Headwear</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'none', label: 'No Glasses' },
                  { id: '3d_glasses', label: '3D Anaglyph Glasses' },
                  { id: 'cyber_visor', label: 'Cyber Neon Visor' },
                  { id: 'gold_headset', label: 'Gold Audio Headset' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => patchAppearance({ accessory: item.id as CharacterAccessoryId })}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border text-left transition-all ${
                      appearance.accessory === item.id
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Headwear Hats */}
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-xs font-semibold text-slate-300">Headwear & Hats</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: 'No Hat' },
                    { id: 'cap_baseball', label: 'Baseball Cap' },
                    { id: 'cowboy_hat', label: 'Cowboy Hat' },
                    { id: 'top_hat', label: 'Formal Top Hat' },
                    { id: 'crown_royal', label: 'Golden Crown' },
                    { id: 'tiny_hat', label: 'Tiny Party Hat' },
                  ].map((hat) => (
                    <button
                      key={hat.id}
                      onClick={() => patchAppearance({ headwear: hat.id as HeadwearId })}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                        appearance.headwear === hat.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      {hat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FUN STUFF (FUNNY COSMETICS) */}
          {activeTab === 'fun_stuff' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Smile className="w-4 h-4 text-rose-400" />
                  <span>Fun Stuff & Hilarious Cosmetics</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  HUMOUR
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'none', label: 'Standard Appearance (No Funny Cosmetic)' },
                  { id: 'glasses_on_head', label: 'Spectacles Sitting on TOP of Head' },
                  { id: 'clown_nose', label: 'Bright Red Clown Nose' },
                  { id: 'oversized_ears', label: 'Giant Oversized Goblin Ears' },
                  { id: 'floating_halo', label: 'Floating Angel Halo' },
                  { id: 'floating_crown', label: 'Floating Golden Tiny Crown' },
                  { id: 'floating_stars', label: 'Orbiting Cartoon Stars' },
                  { id: 'novelty_antennas', label: 'Bouncing Novelty Bug Antennas' },
                  { id: 'oversized_headphones', label: 'Giant Over-Ear Headphones' },
                  { id: 'monocle', label: 'Aristocratic Glass Monocle' },
                  { id: 'cartoon_teeth', label: 'Funny Cartoon Teeth Grin' },
                ].map((item) => {
                  const isSelected = (appearance.funnyCosmetic || 'none') === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => patchAppearance({ funnyCosmetic: item.id as FunnyCosmeticId })}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-rose-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: SAVED OUTFITS */}
          {activeTab === 'saved_outfits' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span>Saved Outfits & Wardrobe Presets</span>
              </h3>

              {/* Save Current Outfit Input */}
              <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 p-2 rounded-xl">
                <input
                  type="text"
                  placeholder="Outfit Name (e.g. Royal VIP)"
                  value={newOutfitName}
                  onChange={(e) => setNewOutfitName(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 placeholder-slate-500 px-2 py-1 focus:outline-none flex-1"
                />
                <button
                  onClick={handleSaveOutfitPreset}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>

              {/* Outfit Presets Grid */}
              <div className="flex flex-col gap-2.5">
                {savedOutfits.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-300">{preset.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => patchAppearance(preset.appearance)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-bold hover:bg-amber-400 transition-all"
                        >
                          Equip
                        </button>
                        {!BUILTIN_OUTFIT_PRESETS.some((b) => b.id === preset.id) && (
                          <button
                            onClick={() => handleDeleteOutfit(preset.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">{preset.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
