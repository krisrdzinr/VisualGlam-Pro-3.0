
import React, { useState, useRef, useEffect } from 'react';
import { Navbar, Footer } from './components/Layout';
import { transformImagePerspective } from './services/geminiService';
import { ImageState, Category, LightingCategory, AngleDefinition, LightingDefinition, AspectRatio } from './types';

const PHOTO_CATEGORIES: Category[] = [
  {
    title: 'Standard Perspectives',
    angles: [
      { name: 'Eye-Level', description: 'Camera at subject’s eye height', bestUse: 'Natural portraits, corporate' },
      { name: 'Flattering High', description: 'Camera just above eye line', bestUse: 'Fashion portraits' },
      { name: 'Powerful Low', description: 'Camera just below eye line', bestUse: 'Confidence shots' },
    ]
  },
  {
    title: 'Cinematic Heights',
    angles: [
      { name: 'High Angle', description: 'Camera above subject looking down', bestUse: 'Editorial looks' },
      { name: 'Bird’s-Eye', description: 'Camera directly overhead', bestUse: 'Creative flat-lays' },
      { name: 'Heroic Low', description: 'Camera below looking up', bestUse: 'Heroic, dramatic' },
      { name: 'Extreme Worm’s-Eye', description: 'Extreme low upward angle', bestUse: 'Cinematic scale' },
    ]
  },
  {
    title: 'Profile & Rotation',
    angles: [
      { name: 'Direct Front', description: 'Subject faces camera', bestUse: 'ID, formal' },
      { name: 'Three-Quarters', description: 'Face turned slightly', bestUse: 'Standard portrait' },
      { name: 'Editorial Profile', description: 'Side view', bestUse: 'Editorial profile' },
    ]
  },
  {
    title: 'Structural Framing',
    angles: [
      { name: 'Face Close-Up', description: 'Focus on eyes and lips', bestUse: 'Intense emotion, detail' },
      { name: 'Standard Medium', description: 'Subject from chest up', bestUse: 'Intimate portraits' },
      { name: 'Waist-Up Shot', description: 'Subject from waist up', bestUse: 'Lifestyle, interactions' },
      { name: 'American Shot', description: 'Subject from knees up', bestUse: 'Attitude, cinematic' },
      { name: 'Full Body', description: 'Subject head to toe', bestUse: 'Fashion showcase' },
    ]
  },
  {
    title: 'Creative Hooks',
    angles: [
      { name: 'Dutch Tilt', description: 'Camera tilted sideways', bestUse: 'Drama, tension' },
      { name: 'Atmospheric Silhouette', description: 'Extreme backlight', bestUse: 'Moody artistic' },
      { name: 'First-Person POV', description: 'Subject perspective', bestUse: 'Action shots' },
    ]
  }
];

const LIGHTING_CATEGORIES: LightingCategory[] = [
  {
    title: 'Chrono-Light (Time of Day)',
    presets: [
      { name: 'Sunrise Glow', description: 'Soft morning light', effect: 'Low-angle warmth, soft shadows' },
      { name: 'High-Noon Harsh', description: 'Vertical sun exposure', effect: 'Short, sharp shadows, high intensity' },
      { name: 'Cinematic Golden Hour', description: 'Magic hour sunset', effect: 'Long amber shadows, warm glow' },
      { name: 'Ethereal Blue Hour', description: 'Twilight ambiance', effect: 'Cool, deep blue tones, low contrast' },
      { name: 'Moonlit Night', description: 'Natural nocturnal light', effect: 'Deep shadows, pale silver highlights' },
      { name: 'Midnight Noir', description: 'Minimalist night', effect: 'High contrast, hidden details' },
    ]
  },
  {
    title: 'Atmospheric Weather',
    presets: [
      { name: 'Foggy Morning', description: 'Dense low-vis mist', effect: 'Muted colors, heavy depth, soft edges' },
      { name: 'Stormy Overcast', description: 'Dark pre-rain clouds', effect: 'Dramatic greys, moody flat light' },
      { name: 'Tropical Mist', description: 'Humid, diffused light', effect: 'Saturated greens, glowing highlights' },
      { name: 'Dust Storm', description: 'Arid desert wind', effect: 'Sepia haze, obscured background' },
      { name: 'Rain-Slicked Street', description: 'Wet urban environment', effect: 'Reflective surfaces, high specular bloom' },
    ]
  },
  {
    title: 'Studio & Artificial',
    presets: [
      { name: 'Soft Box Diffusion', description: 'Commercial studio', effect: 'Shadowless skin, even lighting' },
      { name: 'High Contrast Hard', description: 'Spotlight focus', effect: 'Sharp edges, theatrical depth' },
      { name: 'Neon Cyberpunk', description: 'Vibrant city lights', effect: 'Magenta and cyan rim lighting' },
      { name: 'Warm Candlelight', description: 'Intimate flame source', effect: 'Deep amber, flickering soft shadows' },
      { name: 'Ring Light Glow', description: 'Social media look', effect: 'Iconic eye catchlights, flat face light' },
    ]
  }
];

const ASPECT_RATIOS: { label: string; value: AspectRatio }[] = [
  { label: 'Source', value: 'original' },
  { label: 'Square 1:1', value: '1:1' },
  { label: 'Portrait 3:4', value: '3:4' },
  { label: 'Mobile 9:16', value: '9:16' },
  { label: 'Cinema 16:9', value: '16:9' },
];

const LOADING_STEPS = [
  { title: "Visual Analysis", detail: "Mapping spatial geometry and lighting vectors..." },
  { title: "Perspective Shift", detail: "Calculating new camera matrix..." },
  { title: "Identity Protection", detail: "Isolating subject to prevent distortion..." },
  { title: "Environment Synthesis", detail: "Rendering new atmosphere and shadows..." },
  { title: "Cinema Mastering", detail: "Applying final 8K texture passes..." }
];

const App: React.FC = () => {
  const [selectedAngle, setSelectedAngle] = useState<AngleDefinition | 'Custom'>(PHOTO_CATEGORIES[0].angles[0]);
  const [selectedLighting, setSelectedLighting] = useState<LightingDefinition | 'Default'>(LIGHTING_CATEGORIES[0].presets[0]);
  const [angleEnabled, setAngleEnabled] = useState<boolean>(true);
  const [lightingEnabled, setLightingEnabled] = useState<boolean>(true);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('original');
  const [faceConsistency, setFaceConsistency] = useState<boolean>(true);
  const [highRes, setHighRes] = useState<boolean>(true);
  const [variationCount, setVariationCount] = useState<number>(1);
  const [activePrompt, setActivePrompt] = useState<string>("");
  const [loadingStep, setLoadingStep] = useState<number>(0);

  const [imageState, setImageState] = useState<ImageState>({
    original: null,
    referencePose: null,
    transformed: null,
    loading: false,
    error: null,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (imageState.loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [imageState.loading]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageState(prev => ({ ...prev, error: 'Only image files are supported.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageState(prev => ({
        ...prev,
        original: event.target?.result as string,
        transformed: null,
        loading: false,
        error: null,
      }));
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `visualglam-edit-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const useAsReference = (url: string) => {
    setImageState({
      original: url,
      referencePose: null,
      transformed: null,
      loading: false,
      error: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTransform = async () => {
    if (!imageState.original) {
      setImageState(prev => ({ ...prev, error: "Please upload a photo first." }));
      return;
    }

    setImageState(prev => ({ ...prev, loading: true, error: null, transformed: null }));

    try {
      const angleName = !angleEnabled ? 'Original' : (selectedAngle === 'Custom' ? 'Custom' : selectedAngle.name);
      const angleDesc = !angleEnabled ? 'Preserve source angle' : (selectedAngle === 'Custom' ? 'AI Optimized' : selectedAngle.description);
      const lightingName = !lightingEnabled ? 'Preserve' : (selectedLighting === 'Default' ? 'Studio' : selectedLighting.name);
      const lightingDesc = !lightingEnabled ? 'Keep original lighting' : (selectedLighting === 'Default' ? 'Standard' : selectedLighting.description);

      const transformPromises = Array.from({ length: variationCount }).map(() => 
        transformImagePerspective(
          imageState.original!, 
          angleName, 
          lightingName, 
          angleDesc, 
          lightingDesc,
          activePrompt,
          selectedAspectRatio,
          faceConsistency,
          highRes
        )
      );

      const results = await Promise.all(transformPromises);
      setImageState(prev => ({ ...prev, transformed: results, loading: false }));
    } catch (err: any) {
      console.error("Master Sequence Error:", err);
      const msg = err.message === 'QUOTA_EXCEEDED' 
        ? 'AI Resource Limit Reached. Please try again soon.' 
        : (err.message || 'Render failed.');
        
      setImageState(prev => ({ ...prev, loading: false, error: msg }));
    }
  };

  const clearApp = () => {
    setImageState({
      original: null,
      referencePose: null,
      transformed: null,
      loading: false,
      error: null,
    });
    setActivePrompt("");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isAngleSelected = (angle: AngleDefinition | 'Custom') => {
    if (angle === 'Custom') return selectedAngle === 'Custom';
    return typeof selectedAngle !== 'string' && selectedAngle.name === angle.name;
  };

  const isLightingSelected = (lighting: LightingDefinition | 'Default') => {
    if (lighting === 'Default') return selectedLighting === 'Default';
    return typeof selectedLighting !== 'string' && selectedLighting.name === lighting.name;
  };

  const getContainerAspectRatio = () => {
    if (selectedAspectRatio === 'original') return 'auto';
    return selectedAspectRatio.replace(':', '/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 selection:bg-indigo-500 selection:text-white">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

        {!imageState.original ? (
          <div className="max-w-2xl mx-auto text-center py-20">
            <h1 className="text-6xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-indigo-200 to-slate-500 tracking-tight">
              Virtual Studio Engine
            </h1>
            <p className="text-slate-400 text-xl mb-14 font-medium leading-relaxed">
              Professional perspective control. Re-shoot your photos from any angle with surgical AI precision.
            </p>
            <div 
              className="border-2 border-dashed border-slate-800 bg-slate-900/20 rounded-[40px] p-20 text-center hover:border-indigo-500/50 hover:bg-slate-900/40 transition-all cursor-pointer group shadow-3xl relative overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent pointer-events-none" />
              <div className="w-24 h-24 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all border border-indigo-500/20 shadow-inner">
                <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-3xl font-black text-white mb-3">Upload Source Photo</h3>
              <p className="text-slate-500 mb-10 text-lg">Select a photo to begin your studio re-shoot.</p>
              <button className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95">
                Start Session
              </button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/80 backdrop-blur-xl rounded-[32px] border border-slate-800 shadow-3xl p-8 space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-white tracking-tight uppercase border-l-4 border-indigo-500 pl-4">Engine Config</h2>
                  <button onClick={clearApp} className="text-slate-500 hover:text-red-400 text-xs font-black transition-colors uppercase tracking-widest px-3 py-1 bg-slate-950 rounded-lg">
                    Reset
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Identity Lock</label>
                    <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl group hover:border-indigo-500/30 transition-all">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">Consistency</span>
                        <span className="text-[10px] text-slate-500">Subject Sync</span>
                      </div>
                      <button onClick={() => setFaceConsistency(!faceConsistency)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${faceConsistency ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'bg-slate-800'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${faceConsistency ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Render Level</label>
                    <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl group hover:border-indigo-500/30 transition-all">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">8K Cinema</span>
                        <span className="text-[10px] text-slate-500">Enhanced Detail</span>
                      </div>
                      <button onClick={() => setHighRes(!highRes)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${highRes ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'bg-slate-800'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${highRes ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Variations</label>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl group hover:border-indigo-500/30 transition-all flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">Output Count</span>
                        <span className="text-[10px] text-slate-500">Versions to render</span>
                      </div>
                      <select 
                        value={variationCount}
                        onChange={(e) => setVariationCount(parseInt(e.target.value))}
                        className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-lg border border-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {[1, 2, 3, 4].map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? 'Variation' : 'Variations'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.value}
                        onClick={() => setSelectedAspectRatio(ratio.value)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all border uppercase tracking-wider ${
                          selectedAspectRatio === ratio.value
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Camera Angle</label>
                  <div className="space-y-6 max-h-[300px] overflow-y-auto pr-3 custom-scrollbar">
                    {PHOTO_CATEGORIES.map((cat) => (
                      <div key={cat.title} className="space-y-2">
                        <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.25em] mb-2">{cat.title}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {cat.angles.map((angle) => (
                            <button
                              key={angle.name}
                              onClick={() => setSelectedAngle(angle)}
                              className={`px-3 py-2 text-left rounded-xl text-[10px] font-bold transition-all border leading-tight ${
                                isAngleSelected(angle) 
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' 
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                            >
                              {angle.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Atmosphere & Lighting</label>
                  <div className="space-y-6 max-h-[300px] overflow-y-auto pr-3 custom-scrollbar">
                    {LIGHTING_CATEGORIES.map((cat) => (
                      <div key={cat.title} className="space-y-2">
                        <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.25em] mb-2">{cat.title}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {cat.presets.map((light) => (
                            <button
                              key={light.name}
                              onClick={() => setSelectedLighting(light)}
                              className={`px-3 py-2 text-left rounded-xl text-[10px] font-bold transition-all border leading-tight ${
                                isLightingSelected(light) 
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' 
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                            >
                              {light.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Custom Instructions</label>
                  <textarea 
                    value={activePrompt}
                    onChange={(e) => setActivePrompt(e.target.value)}
                    placeholder="E.g. Change background to a beach, add a red tie..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[100px] transition-all resize-none scrollbar-hide"
                  />
                </div>

                <button
                  onClick={handleTransform}
                  disabled={imageState.loading}
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[24px] font-black text-xl shadow-2xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-4"
                >
                  {imageState.loading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Rendering {variationCount > 1 ? `Variations` : ''}...
                    </>
                  ) : (
                    "DEVELOP MASTER"
                  )}
                </button>

                {imageState.error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-red-400 text-xs font-bold leading-relaxed">{imageState.error}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-8 space-y-10">
              <div className="space-y-4">
                <div className="flex justify-between items-end px-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Source File</span>
                    <span className="text-lg font-black text-white">Input Photo</span>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                    Replace
                  </button>
                </div>
                <div className="aspect-[3/4] bg-slate-900 rounded-[32px] overflow-hidden border-2 border-indigo-500/40 shadow-2xl group relative ring-8 ring-indigo-500/5 max-w-lg mx-auto md:mx-0">
                  <img src={imageState.original!} alt="Source" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em]">Master Render Pipeline</h3>
                </div>
                
                <div className="relative">
                  {imageState.loading ? (
                    <div 
                      className="bg-slate-950 rounded-[40px] border border-slate-800 shadow-3xl relative flex items-center justify-center min-h-[500px] overflow-hidden"
                      style={{ aspectRatio: getContainerAspectRatio() }}
                    >
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl z-20 flex flex-col items-center justify-center p-12">
                        <div className="w-full max-w-md space-y-8">
                          <div className="text-center space-y-4">
                            <div className="relative inline-block mb-4">
                              <div className="w-24 h-24 border-2 border-indigo-500/10 rounded-full animate-ping absolute inset-0" />
                              <div className="w-24 h-24 border-t-2 border-indigo-500 rounded-full animate-spin" />
                            </div>
                            <h4 className="text-white text-3xl font-black tracking-tighter uppercase italic">Developing Output</h4>
                          </div>

                          <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
                            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                <span>Diagnostics</span>
                                <span className="text-slate-400">{Math.round(((loadingStep + 1) / LOADING_STEPS.length) * 100)}%</span>
                            </div>
                            <div className="p-6 space-y-5">
                              {LOADING_STEPS.map((step, i) => (
                                <div key={i} className={`flex gap-4 transition-all duration-700 ${i > loadingStep ? 'opacity-20' : 'opacity-100'}`}>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    i < loadingStep ? 'bg-indigo-600 border-indigo-600' : 'border-slate-800'
                                  }`}>
                                    {i < loadingStep && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M5 13l4 4L19 7" /></svg>}
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className={`text-[11px] font-black uppercase tracking-tight ${i === loadingStep ? 'text-white' : 'text-slate-500'}`}>{step.title}</span>
                                    {i === loadingStep && <span className="text-[10px] text-indigo-400 font-bold italic">{step.detail}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : imageState.transformed ? (
                    <div className={`grid gap-8 ${imageState.transformed.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                      {imageState.transformed.map((url, idx) => (
                        <div key={idx} className="group/item space-y-4">
                          <div className="bg-slate-950 rounded-[40px] overflow-hidden border border-slate-800 shadow-3xl relative flex items-center justify-center ring-1 ring-white/5 group-hover/item:ring-indigo-500/50 transition-all duration-700" style={{ aspectRatio: getContainerAspectRatio() }}>
                            <img src={url} alt={`Master ${idx + 1}`} className="w-full h-full object-contain animate-in" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-all duration-500 flex items-end justify-center pb-10 gap-4">
                              <button onClick={() => downloadImage(url)} className="px-8 py-3 bg-white text-slate-950 rounded-2xl hover:scale-105 active:scale-90 transition-all font-black text-xs uppercase tracking-[0.2em] shadow-3xl">Export Render</button>
                              <button onClick={() => useAsReference(url)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl hover:scale-105 active:scale-90 transition-all font-black text-xs uppercase tracking-[0.2em] shadow-3xl">Iterate</button>
                            </div>
                          </div>
                          {imageState.transformed.length > 1 && (
                            <div className="text-center">
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Version {idx + 1}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-900/20 rounded-[40px] border border-slate-800 shadow-inner flex items-center justify-center min-h-[400px] border-dashed">
                      <div className="text-center p-16 max-w-sm space-y-4">
                        <h5 className="text-white text-lg font-black uppercase tracking-widest italic">Engine Idle</h5>
                        <p className="text-slate-500 font-medium leading-relaxed italic text-sm">Select perspective and lighting parameters then press "Develop Master".</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #312e81; }
        
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
