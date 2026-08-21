# Library — the public catalogue

One folder per subject, MP4s inside. Drop a file in and it shows up at
`/library`; delete it and it's gone. Nothing to register, no metadata file.

    storage/library/physics/why-orbits-are-ellipses.mp4
        -> "Why orbits are ellipses", under Physics

Naming rules:

* **Filename becomes the title.** Hyphens and underscores become spaces and the
  first letter is capitalised, so name files the way you want them read:
  `how-a-transistor-switches.mp4` -> "How a transistor switches".
* **Folder name becomes the subject**, using the same rule —
  `computer-science` -> "Computer science".
* Empty folders are skipped, so a subject only appears once it has a video.
* `.mp4`, `.webm` and `.mov` are recognised; anything else is ignored.

To publish one of your own generated videos, download it from **My videos** and
copy it here under whatever name you want it listed as.
