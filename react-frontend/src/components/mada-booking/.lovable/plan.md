

## Plan : Editeur visuel (WYSIWYG) pour les CGV

### Probleme
Actuellement l'éditeur de CGV affiche du code HTML brut dans un `<textarea>`. Pour un utilisateur non-technique, c'est inutilisable.

### Solution

Remplacer le `<textarea>` par un éditeur visuel riche utilisant `contentEditable` avec une barre d'outils intégrée. Pas de dépendance externe nécessaire -- on construit un composant `RichTextEditor` léger basé sur `document.execCommand`.

#### Composant `RichTextEditor`

Nouveau composant `src/components/RichTextEditor.tsx` avec :

- **Barre d'outils** : Gras, Italique, Souligné, Titres (H1/H2/H3), Listes (puces/numérotées), Lien, Séparateur horizontal
- **Zone d'édition** : `contentEditable` div qui affiche le contenu comme il apparaitra au public
- **Synchronisation** : `onInput` remonte le `innerHTML` vers le state parent

#### Modification de `CGVAdminPage.tsx`

- Remplacer le `<textarea>` par `<RichTextEditor value={content} onChange={setContent} />`
- Supprimer le bouton "Aperçu" séparé (l'éditeur est déja visuel, mais on peut le garder en option)
- Mettre a jour le sous-titre : "Modifiez les CGV affichées publiquement" au lieu de "Modifiez le contenu HTML..."

### Fichiers

| Fichier | Action |
|---------|--------|
| `src/components/RichTextEditor.tsx` | **Créer** -- editeur WYSIWYG léger |
| `src/pages/CGVAdminPage.tsx` | **Modifier** -- utiliser RichTextEditor |

