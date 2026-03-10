# Guidelines de Layout - EXED Manager 365

## Boutons dans les cartes (Cards)

### Problème identifié
Les boutons peuvent déborder de leurs conteneurs si :
- Un bouton a `flex-1` mais pas les autres
- Le conteneur n'a pas `flex-wrap`
- Les largeurs minimales ne sont pas définies

### Solution recommandée

#### Option 1 : Utiliser le composant `CardButtonGroup`
```tsx
import { CardButtonGroup } from "@/components/CardButtonGroup";

<Card>
  <CardContent>
    {/* ... contenu ... */}
    
    <CardButtonGroup>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-1 min-w-[100px]"
      >
        Action 1
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        className="flex-1 min-w-[100px]"
      >
        Action 2
      </Button>
    </CardButtonGroup>
  </CardContent>
</Card>
```

#### Option 2 : Pattern manuel
```tsx
<div className="mt-4 flex flex-wrap gap-2">
  <Button 
    variant="outline" 
    size="sm" 
    className="flex-1 min-w-[100px]"
  >
    Statistiques
  </Button>
  <Button 
    variant="outline" 
    size="sm"
    className="flex-1 min-w-[100px]"
  >
    Modifier
  </Button>
</div>
```

### Règles à respecter

1. **Toujours utiliser `flex-wrap`** sur le conteneur
   - Permet aux boutons de passer à la ligne sur mobile
   - Évite les débordements horizontaux

2. **Appliquer `flex-1` à TOUS les boutons ou à AUCUN**
   - Ne jamais mélanger flex-1 et tailles fixes
   - Garantit une répartition équitable de l'espace

3. **Définir une largeur minimale** avec `min-w-[XXXpx]`
   - min-w-[100px] pour les boutons courts
   - min-w-[120px] pour les boutons avec texte plus long
   - Empêche les boutons de devenir trop petits

4. **Utiliser `size="sm"` pour les boutons de carte**
   - Réduit la hauteur pour un meilleur ratio visuel
   - Économise l'espace dans les cartes compactes

5. **Espacement uniforme** avec `gap-2`
   - Espacement cohérent entre les boutons
   - S'adapte automatiquement au flex-wrap

### Exemples par cas d'usage

#### Cas 1 : Deux boutons égaux
```tsx
<div className="mt-4 flex flex-wrap gap-2">
  <Button size="sm" className="flex-1 min-w-[100px]">Action 1</Button>
  <Button size="sm" className="flex-1 min-w-[100px]">Action 2</Button>
</div>
```

#### Cas 2 : Un seul bouton pleine largeur
```tsx
<Button size="sm" className="w-full mt-4">
  Gérer les modules
</Button>
```

#### Cas 3 : Boutons conditionnels
```tsx
<div className="mt-4 flex flex-wrap gap-2">
  <Button size="sm" className="flex-1 min-w-[100px]">Statistiques</Button>
  {canEdit() && (
    <Button size="sm" className="flex-1 min-w-[100px]">Modifier</Button>
  )}
</div>
```

#### Cas 4 : Plus de 2 boutons
```tsx
<div className="mt-4 flex flex-wrap gap-2">
  <Button size="sm" className="flex-1 min-w-[90px]">Voir</Button>
  <Button size="sm" className="flex-1 min-w-[90px]">Modifier</Button>
  <Button size="sm" className="flex-1 min-w-[90px]">Supprimer</Button>
</div>
```

#### Cas 5 : Boutons avec icônes uniquement (dans le header)
```tsx
<CardHeader>
  <div className="flex items-start justify-between">
    <CardTitle>Titre</CardTitle>
    <div className="flex gap-2">
      <Button variant="ghost" size="icon">
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
</CardHeader>
```

## Responsive sur mobile

### Texte des boutons
Pour économiser l'espace sur mobile, utilisez du texte conditionnel :

```tsx
<Button size="sm" className="flex-1 min-w-[100px]">
  <Icon className="w-4 h-4 mr-1" />
  <span className="hidden sm:inline">Texte complet</span>
  <span className="sm:hidden">Court</span>
</Button>
```

Exemple :
```tsx
<Button size="sm" className="flex-1 min-w-[100px]">
  <TrendingUp className="w-4 h-4 mr-1" />
  <span className="hidden sm:inline">Statistiques</span>
  <span className="sm:hidden">Stats</span>
</Button>
```

## Vérification des pages

### ✅ Pages corrigées
- **Clients** : Boutons avec flex-wrap et min-width

### ✅ Pages vérifiées (pas de problème)
- **Dashboard** : Utilise des grilles de cartes sans boutons dedans
- **Stagiaires** : Cartes sans boutons
- **Enseignants** : Cartes sans boutons
- **Classes** : Un seul bouton `w-full`, pas de risque
- **Modules** : Boutons icon dans le header, pas dans CardContent
- **Programmes** : Pas de boutons dans les cartes actuellement

### 📋 À vérifier lors de futurs ajouts
Quand vous ajoutez des boutons dans des cartes :
1. Vérifiez que le conteneur a `flex flex-wrap gap-2`
2. Ajoutez `flex-1 min-w-[100px]` à chaque bouton
3. Testez sur mobile (viewport < 640px)
4. Vérifiez qu'aucun bouton ne déborde

## Checklist pour les PR

Avant de soumettre une PR avec des modifications de cartes :
- [ ] Les boutons utilisent `flex-wrap` sur le conteneur
- [ ] Tous les boutons ont soit `flex-1` soit une largeur fixe
- [ ] Une largeur minimale est définie (`min-w-[XXX]`)
- [ ] Testé sur mobile (< 640px)
- [ ] Testé avec 1, 2, 3+ boutons
- [ ] Testé avec et sans boutons conditionnels
