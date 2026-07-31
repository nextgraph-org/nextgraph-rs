import "./App.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

function App() {

  const editor = useCreateBlockNote();
  return <div><h1>docs</h1><BlockNoteView editor={editor} /></div>;

}

export default App;
