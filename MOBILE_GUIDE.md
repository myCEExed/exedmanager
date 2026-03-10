# Guide d'utilisation mobile - EXED Manager 365

## Optimisations mobiles implémentées

L'application a été optimisée pour une utilisation fluide sur smartphones et tablettes :

### 1. Interface responsive
- ✅ Navigation adaptative avec menu hamburger sur mobile
- ✅ Grilles qui s'adaptent automatiquement (1 colonne sur mobile, 2 sur tablette, 3+ sur desktop)
- ✅ Cartes et contenus qui s'empilent verticalement sur petit écran
- ✅ Boutons et textes optimisés pour les petits écrans

### 2. Interactions tactiles
- ✅ Zones de toucher agrandies (minimum 44x44px)
- ✅ Suppression des effets de surbrillance au toucher
- ✅ Gestes tactiles optimisés
- ✅ Défilement fluide des tableaux

### 3. Formulaires et dialogues
- ✅ Dialogues avec hauteur maximale et défilement (85% de l'écran)
- ✅ Champs de formulaire empilés sur mobile
- ✅ Boutons pleine largeur sur mobile
- ✅ Labels et textes lisibles

### 4. Tableaux
- ✅ Défilement horizontal automatique
- ✅ Composant ResponsiveTable pour tous les tableaux
- ✅ Données tabulaires transformées en cartes sur mobile

### 5. Navigation
- ✅ Menu latéral caché sur mobile
- ✅ Menu hamburger accessible
- ✅ Logo adapté en taille
- ✅ Icônes et badges lisibles

## Comment tester sur mobile

### Option 1 : Simulateur dans le navigateur
1. Ouvrez l'application dans Chrome/Firefox
2. Appuyez sur F12 pour ouvrir les DevTools
3. Cliquez sur l'icône de responsive design (📱)
4. Sélectionnez un appareil (iPhone, Galaxy, iPad, etc.)

### Option 2 : Sur votre smartphone/tablette
1. Publiez l'application via le bouton "Publish"
2. Accédez à l'URL depuis votre appareil mobile
3. Testez toutes les fonctionnalités

### Option 3 : Lovable Preview
1. Dans Lovable, cliquez sur l'icône 📱/💻 au-dessus de la prévisualisation
2. Basculez entre les vues mobile, tablette et desktop

## Pages optimisées

- ✅ **Dashboard** : Cartes empilées, alertes responsive
- ✅ **Programmes** : Grille adaptative, boutons compacts
- ✅ **Stagiaires** : Cartes en grille, formulaire mobile-friendly
- ✅ **Toutes les pages** : Header responsive, navigation mobile

## Composants réutilisables

### ResponsiveTable
```tsx
import { ResponsiveTable } from "@/components/ResponsiveTable";

<ResponsiveTable>
  <TableHeader>...</TableHeader>
  <TableBody>...</TableBody>
</ResponsiveTable>
```

### MobileHeader
```tsx
import { MobileHeader } from "@/components/MobileHeader";

<MobileHeader 
  title="Ma Page"
  description="Description de la page"
  actions={<Button>Action</Button>}
/>
```

### MobileGrid
```tsx
import { MobileGrid } from "@/components/MobileOptimized";

<MobileGrid cols="3">
  {items.map(item => <Card key={item.id}>...</Card>)}
</MobileGrid>
```

## Classes utilitaires

Utilisez ces classes Tailwind pour optimiser vos propres composants :

```tsx
// Grille responsive
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"

// Titres responsive
className="text-2xl sm:text-3xl"

// Boutons empilés sur mobile
className="flex flex-col sm:flex-row gap-2"

// Espacement responsive
className="space-y-4 sm:space-y-6"

// Padding responsive
className="p-4 sm:p-6"

// Largeur complète sur mobile
className="w-full sm:w-auto"
```

## Recommandations

1. **Toujours tester** : Vérifiez l'apparence sur mobile avant de publier
2. **Touches minimales** : Zones tactiles de minimum 44x44px
3. **Lisibilité** : Texte minimum 16px sur mobile
4. **Performance** : Images optimisées, chargement rapide
5. **Orientation** : Supporte portrait et paysage

## Support des navigateurs mobiles

- ✅ Safari iOS 12+
- ✅ Chrome Android 80+
- ✅ Firefox Mobile
- ✅ Samsung Internet
- ✅ Edge Mobile
