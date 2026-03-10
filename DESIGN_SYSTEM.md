# Design System - EXED Manager 365

## Palette de couleurs

### Couleurs principales

#### Bordeaux (Primary) - Couleur principale de la marque
- **Light Mode**: `hsl(345, 67%, 37%)` - Un bordeaux professionnel et élégant
- **Dark Mode**: `hsl(345, 67%, 45%)` - Version légèrement plus claire
- **Usage**: Boutons principaux, liens actifs, éléments importants, sidebar

#### Violet (Accent) - Couleur d'accentuation
- **Light Mode**: `hsl(267, 20%, 48%)` - Un violet subtil et moderne
- **Dark Mode**: `hsl(267, 20%, 55%)` - Version légèrement plus claire
- **Usage**: Éléments d'accentuation, badges spéciaux, hover states secondaires

### Couleurs secondaires

#### Secondary
- Dérivées du bordeaux avec saturation réduite
- Light: `hsl(345, 15%, 93%)`
- Dark: `hsl(345, 15%, 20%)`

#### Muted
- Couleurs atténuées pour le texte secondaire et backgrounds
- Light: `hsl(345, 10%, 95%)`
- Dark: `hsl(345, 15%, 20%)`

### Couleurs fonctionnelles

#### Destructive (Rouge)
- `hsl(0, 84%, 60%)` - Pour les actions destructives et erreurs

#### Warning (Orange)
- `hsl(33, 100%, 58%)` - Pour les avertissements

#### Success (Vert)
- `hsl(142, 76%, 36%)` - Pour les confirmations et succès

## Hiérarchie visuelle

### Utilisation des couleurs

1. **Primary (Bordeaux)**: 
   - Boutons d'action principaux
   - Navigation active
   - Éléments cliquables importants
   - Sidebar et menu principal

2. **Accent (Violet)**:
   - Badges informatifs
   - Éléments de mise en évidence secondaires
   - Hover states sur éléments non-primaires
   - Icônes décoratives

3. **Secondary**:
   - Backgrounds de sections
   - Boutons secondaires
   - Cartes et conteneurs

4. **Muted**:
   - Texte secondaire
   - Placeholders
   - Separateurs subtils

## Sidebar

La sidebar utilise le bordeaux comme couleur de fond principale :
```css
--sidebar-background: 345 67% 37%;
--sidebar-foreground: 0 0% 100% (blanc);
--sidebar-accent: 345 70% 33% (bordeaux plus foncé);
--sidebar-border: 345 60% 45% (bordeaux plus clair);
```

## Composants UI

### Boutons

#### Button Primary
```tsx
<Button>Action Principale</Button>
// Couleur: Bordeaux (primary)
```

#### Button Accent
```tsx
<Button variant="accent">Action Secondaire</Button>
// Couleur: Violet (accent)
```

#### Button Outline
```tsx
<Button variant="outline">Action Tertiaire</Button>
// Couleur: Border bordeaux avec texte bordeaux
```

### Badges

#### Badge Default
```tsx
<Badge>Info</Badge>
// Couleur: Bordeaux
```

#### Badge Accent
```tsx
<Badge variant="accent">Spécial</Badge>
// Couleur: Violet
```

### Links & Navigation

- **Lien actif**: Bordeaux
- **Lien hover**: Bordeaux + opacity
- **Navigation active**: Background bordeaux + texte blanc

## Accessibilité

### Contraste

Tous les couples de couleurs respectent les ratios WCAG AA :
- Bordeaux sur blanc: ✓ AAA (contraste > 7:1)
- Blanc sur bordeaux: ✓ AAA (contraste > 7:1)
- Violet sur blanc: ✓ AA (contraste > 4.5:1)

### Dark Mode

Le mode sombre utilise des versions ajustées des couleurs pour maintenir :
- Un bon contraste
- Une cohérence visuelle
- Un confort de lecture

## Guidelines d'utilisation

### Quand utiliser Primary (Bordeaux)

✅ Actions principales (Créer, Valider, Enregistrer)
✅ Navigation active
✅ Liens importants
✅ Éléments interactifs critiques

❌ Texte courant
❌ Backgrounds larges
❌ Éléments décoratifs uniquement

### Quand utiliser Accent (Violet)

✅ Badges informatifs
✅ Statistiques spéciales
✅ Éléments de mise en évidence
✅ Hover states secondaires

❌ Boutons d'action principale
❌ Navigation principale
❌ Alertes critiques

### Éviter

❌ Mélanger primary et accent sur le même élément
❌ Utiliser plus de 3 couleurs dans un composant
❌ Ignorer la hiérarchie des couleurs
❌ Utiliser des couleurs arbitraires hors du design system

## Maintenance

Toutes les couleurs sont définies dans `src/index.css` en utilisant le format HSL pour :
- Facilité d'ajustement
- Support natif du dark mode
- Cohérence avec Tailwind CSS

Pour modifier une couleur, éditer les variables CSS correspondantes :
```css
:root {
  --primary: 345 67% 37%; /* Bordeaux */
  --accent: 267 20% 48%;  /* Violet */
}
```

## Évolution future

Le design system est conçu pour évoluer :
- Ajout de nouvelles couleurs fonctionnelles si besoin
- Refinement des nuances selon les retours utilisateurs
- Support de thèmes personnalisés par organisation

Pour toute modification, consulter ce document et maintenir la cohérence globale.
