# Globalen Music Player reparieren

## Umsetzung
- Die simulierte Zeitschleife im bestehenden Player durch genau ein globales `HTMLAudioElement` ersetzen.
- Trackquelle, Lautstärke, Seek, Pause/Play und Trackwechsel direkt mit diesem Audioelement verbinden.
- Player-Zustand und Fortschritt ausschließlich über echte Audioereignisse aktualisieren; fehlgeschlagene oder fehlende Quellen bleiben pausiert.
- Bestehende Queue-, Shuffle-, Repeat-, Favoriten- und Bibliothekslogik unverändert weiterverwenden.

## Prüfung
- Player mit einer echten erreichbaren Audiodatei testen: Start, Pause, Fortsetzen, Seek, Lautstärke und nächster Track.
- Fehlende Audioquelle prüfen: kein laufender Timer und keine fälschliche Wiedergabeanzeige.
- TypeScript-Prüfung und Browserprüfung ohne Konsolenfehler durchführen.

## Technische Details
- Kein Web-Audio-Graph und keine zweite Player-Instanz; die Browser-Audio-API reicht aus und ist auch für mobile Browser der robusteste Weg.
- Die Audioquelle bleibt das bestehende `Song.audio`-Feld; gesperrte Tracks werden weiterhin ausgefiltert.
