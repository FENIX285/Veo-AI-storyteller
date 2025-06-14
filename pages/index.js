import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Clipboard, Check, Bot, LoaderCircle, FilePlus, RefreshCw } from 'lucide-react';

// Este componente ahora es tu `pages/index.js`
const App = () => {
  const [generationMode, setGenerationMode] = useState('interactive');
  const [userIdea, setUserIdea] = useState('');
  const [storyPrompt, setStoryPrompt] = useState('');
  const [nextSceneIdea, setNextSceneIdea] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [error, setError] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  const resultRef = useRef(null);

  useEffect(() => {
    if (storyPrompt) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [storyPrompt]);

  const generatePromptWithGemini = async ({
    mode,
    initialIdea = '',
    existingStory = '',
    nextSceneHint = ''
  }) => {
    const currentLoadingSetter = mode === 'add' ? setIsAddingScene : setIsLoading;
    currentLoadingSetter(true);
    setError('');

    // --- MASTER INSTRUCTIONS v6.0 - The Auteur Engine ---
    const baseInstructions = `
      Eres "The Auteur", un director de cine IA para Google Veo. Tu especialidad es transformar ideas simples en prompts de nivel experto, aplicando una profunda comprensión de la cinematografía y la "Teoría del Prompt".

      *** 1. PARÁMETROS TÉCNICOS Y ESTRUCTURALES ***
      - **Autonomía Técnica:** Para cada NUEVO prompt, DEBES decidir e incluir los parámetros técnicos al principio.
          - \`--aspectRatio\`: Infiere el formato ideal (16:9 para cine, 9:16 para social). En caso de duda, 16:9.
          - \`--negativePrompt\`: Incluye siempre un prompt negativo robusto y bien formulado (ej: 'baja calidad, borroso, deforme, mala anatomía, artefactos, texto feo, marcas de agua').
      - **Estructura:** Usa \`--macro\` para la visión general (solo en cortometrajes/películas) y \`-scene\` para cada toma individual.

      *** 2. COMPONENTES DE ESCENA (LA VISIÓN DEL DIRECTOR) ***
      En cada \`-scene\`, detalla CUIDADOSAMENTE:
      - **Cámara:** NO uses términos simples. USA lenguaje profesional: "travelling lateral lento", "dolly zoom sobre el rostro", "plano grúa ascendente", "rack focus del objeto a los ojos del personaje". Especifica lentes: "teleobjetivo para comprimir el fondo", "gran angular para una escala épica".
      - **Acción:** Describe la narrativa visual. ¿Cuál es la emoción detrás del movimiento? ¿Qué revela esta acción sobre el personaje o la trama? Aquí puedes usar **Diálogo Implícito** (ej: 'Susurra algo ininteligible, apretando el puño').
      - **Ambiente:** Define la atmósfera con precisión. Habla de la iluminación ('luz volumétrica', 'iluminación de tres puntos'), el color ('paleta de colores desaturada con una LUT de película fría'), y el estado de ánimo ('atmósfera opresiva y claustrofóbica').
      - **Audio:** Diseña un paisaje sonoro. No solo SFX. Describe la calidad del sonido ('el eco metálico de pasos en un pasillo vacío') y el estilo musical ('una partitura de piano melancólica y disonante').
      - **Diálogo:** Para diálogo audible (explícito), debe ser corto (máx. 15 palabras). Formato: \`--dialogue | Personaje: [Nombre] | Idioma: [Idioma] | Línea: "[Texto]"\`.

      *** 3. TÉCNICAS NARRATIVAS AVANZADAS (EL ARTE DE LA DIRECCIÓN) ***
      Para cada escena, considera aplicar UNA de estas técnicas para hacerla más dinámica:
      - **Encadenamiento de Emociones:** Muestra un arco emocional rápido (ej: de la calma a la furia).
      - **Puntos de Inicio/Fin:** Comienza la escena con una emoción y termínala con otra opuesta.
      - **Dirección Vaga Estratégica:** Si buscas naturalidad, describe la intención emocional en lugar de la acción física exacta (ej: 'Mira por la ventana, considerando sus opciones con una mezcla de esperanza y temor').
      - **Acciones Simples Enfocadas:** Un gesto pequeño y detallado puede decir mucho (ej: 'Aprieta lentamente la mandíbula, sus nudillos blancos').

      *** 4. CONTINUIDAD Y 'FLOW' (PARA MODO PELÍCULA) ***
      Al añadir una nueva escena, debes actuar como un editor de cine:
      - **Analiza la pista del usuario y la última escena.**
      - **Decide la transición:** ¿Es mejor un \`Extend\` o un \`Jump to\`?
        - Si la acción debe continuar fluidamente, genera una escena que se sienta como una extensión directa.
        - Si se necesita un cambio de perspectiva, "salta" a un nuevo plano (ej: de un plano general a un primer plano de reacción, o a la vista de otro personaje). Tu prompt debe describir esta nueva toma.

      *** REGLA DE ORO: CADA ESCENA = UN MOMENTO DE 8 SEGUNDOS ***
    `;

    let taskSpecificInstructions;
    
    if (mode === 'add') {
       taskSpecificInstructions = `
        **TAREA: Continuar Película (Función 'Flow')**
        Añade UNA SOLA nueva '-scene' a la historia.
        Contexto (Guion actual):
        ---
        ${existingStory}
        ---
        **Tu Proceso como Editor:**
        1.  Lee la última escena y la pista del usuario: "${nextSceneHint}".
        2.  Decide la mejor transición: ¿Continuar la acción (\`Extend\`) o saltar a un nuevo plano (\`Jump to\`)?
        3.  Escribe el prompt para esa nueva escena, manteniendo consistencia absoluta con el \`--macro\` y aplicando todas las técnicas avanzadas. NO repitas el guion anterior.
      `;
    } else {
      let taskDescription = '';
      if (mode === 'single') taskDescription = `Crea UN ÚNICO prompt de '-scene'. NO uses '--macro'.`;
      if (mode === 'full') taskDescription = `Crea un CORTOMETRAJE (3-5 escenas) con un '--macro' inicial.`;
      if (mode === 'interactive') taskDescription = `INICIA UNA PELÍCULA con un '--macro' detallado y SOLO LA PRIMERA '-scene'.`;

      taskSpecificInstructions = `
        **TAREA: ${taskDescription}**
        - Inicia el prompt con los parámetros técnicos autónomos (--aspectRatio y --negativePrompt).
        - Aplica todas tus habilidades como director de IA.
        **Idea del usuario:** "${initialIdea}"
      `;
    }
    
    const masterPrompt = baseInstructions + taskSpecificInstructions;
    
    try {
      // LLAMADA SEGURA A LA API: ahora llamas a tu propio backend en Vercel.
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: masterPrompt }),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }

      const result = await response.json();

      if (result.text) {
        const generatedText = result.text;
        if (mode === 'add') {
          setStoryPrompt(prev => prev.trim() + '\n\n' + generatedText.trim());
          setNextSceneIdea('');
        } else {
          setStoryPrompt(generatedText.trim());
        }
      } else {
        setError('La respuesta de la API no tuvo el formato esperado.');
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error al contactar tu API. Revisa la consola del servidor de Vercel.');
    } finally {
      currentLoadingSetter(false);
    }
  };

  // --- Handlers for UI events (sin cambios) ---
  const handleInitialGeneration = (e) => { e.preventDefault(); if (userIdea.trim()) { setStoryPrompt(''); generatePromptWithGemini({ mode: generationMode, initialIdea: userIdea }); } };
  const handleAddScene = () => { if (storyPrompt) { generatePromptWithGemini({ mode: 'add', existingStory: storyPrompt, nextSceneHint: nextSceneIdea }); } };
  const handleCopyToClipboard = () => { if (storyPrompt) { const ta = document.createElement("textarea"); ta.value = storyPrompt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); } catch (err) { console.error('Copy failed', err); } document.body.removeChild(ta); } };
  const handleReset = () => { setUserIdea(''); setStoryPrompt(''); setNextSceneIdea(''); setError(''); setIsLoading(false); setIsAddingScene(false); };
  const handleModeChange = (mode) => { setGenerationMode(mode); handleReset(); };
  const getButtonText = () => { if (generationMode === 'single') return 'Generar Escena'; if (generationMode === 'full') return 'Generar Cortometraje'; return 'Iniciar Película'; };

  return (
    <div className="flex flex-col items-center min-h-screen w-full bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-500">Veo Auteur Engine</h1>
            <p className="text-lg text-gray-400 mt-2">Tu director de cine IA. Potenciado por la Teoría del Prompt.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col gap-6">
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                    <h2 className="text-xl font-semibold mb-3 text-cyan-400">1. Formato Narrativo</h2>
                     <div className="flex justify-center gap-2 mb-4 p-1 bg-gray-900/50 rounded-lg">
                        {[{mode:'single', label:'Escena Única'}, {mode:'full', label:'Cortometraje'}, {mode:'interactive', label:'Película (Flow)'}].map(item => (
                            <button key={item.mode} onClick={() => handleModeChange(item.mode)} className={`w-1/3 py-2 rounded-md font-semibold transition-all text-sm ${generationMode === item.mode ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>{item.label}</button>
                        ))}
                    </div>

                    <h2 className="text-xl font-semibold mb-3 mt-6 text-cyan-400">2. Tu Visión Creativa</h2>
                    <form onSubmit={handleInitialGeneration}>
                        <textarea value={userIdea} onChange={(e) => setUserIdea(e.target.value)}
                        placeholder="Ej: Un explorador espacial encuentra una antigua ruina alienígena en un planeta helado."
                        className="w-full h-28 p-3 bg-gray-800 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"/>
                        <div className="flex gap-4 mt-4">
                             <button type="submit" disabled={isLoading || isAddingScene || !userIdea.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all">
                                {isLoading ? <LoaderCircle className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}<span>{getButtonText()}</span>
                            </button>
                             <button type="button" onClick={handleReset} className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors" title="Empezar de nuevo"><RefreshCw className="w-5 h-5" /></button>
                        </div>
                    </form>
                </div>
                
                {generationMode === 'interactive' && storyPrompt && (
                     <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 animate-fade-in">
                        <h2 className="text-xl font-semibold mb-3 text-cyan-400">3. Dirige la Siguiente Escena</h2>
                        <textarea value={nextSceneIdea} onChange={(e) => setNextSceneIdea(e.target.value)} placeholder="¿Qué pasa ahora? La IA decidirá la mejor transición."
                        className="w-full h-20 p-3 bg-gray-800 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"/>
                        <button onClick={handleAddScene} disabled={isLoading || isAddingScene} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed">
                            {isAddingScene ? <LoaderCircle className="animate-spin w-5 h-5" /> : <FilePlus className="w-5 h-5" />}<span>Añadir Escena a la Película</span>
                        </button>
                    </div>
                )}
            </div>
            
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl flex flex-col min-h-[500px]">
                <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-t-xl flex-shrink-0">
                    <h2 className="text-xl font-semibold text-gray-200">Guion Generado para Veo</h2>
                    {storyPrompt && (<button onClick={handleCopyToClipboard} className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 transition-colors">
                        {isCopied ? <Check className="w-5 h-5 text-green-400" /> : <Clipboard className="w-5 h-5" />}<span>{isCopied ? 'Copiado' : 'Copiar'}</span>
                    </button>)}
                </div>
                <div ref={resultRef} className="p-6 overflow-y-auto h-full">
                    {(isLoading && !isAddingScene) && <div className="flex flex-col items-center justify-center h-full text-gray-400"><LoaderCircle className="w-12 h-12 animate-spin text-indigo-500 mb-4" /><p>El Auteur está componiendo...</p></div>}
                    {error && <div className="text-red-400 bg-red-900/30 p-4 rounded-lg"><p className="font-bold">Error</p><p>{error}</p></div>}
                    {storyPrompt && <pre className="whitespace-pre-wrap text-left text-gray-300 font-mono text-sm leading-relaxed">{storyPrompt}</pre>}
                    {isAddingScene && <div className="flex items-center gap-3 text-gray-400 mt-4 p-2 bg-gray-700/50 rounded-md"><LoaderCircle className="w-5 h-5 animate-spin text-green-500" /><p>Editando la siguiente toma...</p></div>}
                     {!storyPrompt && !isLoading && !error && <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center"><Bot size={48} className="mb-4"/><p className="text-lg">El guion aparecerá aquí.</p><p>Elige un modo y describe tu visión.</p></div>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
