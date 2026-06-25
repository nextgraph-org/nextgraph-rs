# Glossary

| Term          | Description                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Shell         | The NextGraph application which embeds all other components, applications, etc.                                                 |
| Component     | An element written in any framework that can be mounted from the shell or an application. Components can embed other components |
| Viewer App    | A component which has the purpose of displaying a resource                                                                      |
| Editor App    | A component which has the purpose of editing resource                                                                           |
| Singleton App | A component which can interact with more than one resource and that supports routing                                            |
| Micro App     | A viewer, editor, or singleton app                                                                                              |
| Zera          | A collection of viewers, editors, singletons, permissions, and shapes. Installable as apps from the app store                   |

The singletons can have access to some documents, store, the full dataset. But they are not something you can launch from a right click on a document, nor configure as default viewer or editor.
By example: a music jukebox like Spotify, is a singleton. It can read all the music you have in your stores/dataset
and play them.
Every time there is a new audio file added to your dataset, the jukebox indexes it
but if you create a playlist, this is a document. so we need a viewer and editor of a playlist datatype.
in the Jukebox Zera, you will have, at least :

a singleton Jukebox
a viewer and editor of playlist document datatype
a shape for this playlist format
a shape for the audio files in order to ask permission to read all audio files i the system
permissions (access need)

maybe we should have a way to define actions on datatypes, that relate to singletons. like for an audio file: "open in Jukebox" or "add to playlist"
but that's different from "view with..." or "edit with..."
"view with" would be just an audio player.
