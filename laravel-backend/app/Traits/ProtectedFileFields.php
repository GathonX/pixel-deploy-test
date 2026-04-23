<?php

namespace App\Traits;

/**
 * Trait ProtectedFileFields
 * 
 * Protection automatique contre la corruption des champs de fichiers lors des mises à jour en masse.
 * Empêche l'écrasement accidentel de chemins de fichiers par des valeurs invalides.
 */
trait ProtectedFileFields
{
    /**
     * Liste des champs de fichiers protégés pour ce modèle.
     * À surcharger dans chaque modèle qui utilise ce trait.
     */
    //protected array $protectedFileFields = [];

    /**
     * Override de la méthode update() pour protéger les champs de fichiers
     */
    public function update(array $attributes = [], array $options = []): bool
    {
        // Retirer les champs de fichiers protégés des attributs
        $safeAttributes = $this->removeProtectedFileFields($attributes);
        
        return parent::update($safeAttributes, $options);
    }

    /**
     * Override de la méthode fill() pour protéger les champs de fichiers
     */
    public function fill(array $attributes): static
    {
        // ✅ CORRECTION: Autoriser file_path lors de la création (modèle n'existe pas encore)
        if (!$this->exists) {
            return parent::fill($attributes);
        }

        // Retirer les champs de fichiers protégés des attributs lors des mises à jour
        $safeAttributes = $this->removeProtectedFileFields($attributes);

        return parent::fill($safeAttributes);
    }

    /**
     * Retire les champs de fichiers protégés d'un tableau d'attributs
     */
    private function removeProtectedFileFields(array $attributes): array
    {
        $protectedFields = $this->getProtectedFileFields();
        
        foreach ($protectedFields as $field) {
            unset($attributes[$field]);
        }
        
        return $attributes;
    }

    /**
     * Obtient la liste des champs de fichiers protégés
     */
    private function getProtectedFileFields(): array
    {
        return $this->protectedFileFields ?? [];
    }

    /**
     * Mise à jour sécurisée d'un champ de fichier spécifique
     * À utiliser uniquement quand on veut vraiment mettre à jour un fichier
     */
    public function updateFileField(string $fieldName, ?string $filePath): bool
    {
        // Vérifier que le champ est bien protégé
        if (!in_array($fieldName, $this->getProtectedFileFields())) {
            throw new \InvalidArgumentException("Le champ '$fieldName' n'est pas un champ de fichier protégé.");
        }

        // Valider le chemin de fichier
        if ($filePath !== null && ($filePath === '0' || $filePath === 'null' || trim($filePath) === '')) {
            throw new \InvalidArgumentException("Tentative d'assigner une valeur invalide ('$filePath') au champ de fichier '$fieldName'.");
        }

        // Utiliser le query builder direct pour bypasser complètement le trait
        $updated = static::where($this->getKeyName(), $this->getKey())
            ->update([$fieldName => $filePath]);

        if ($updated) {
            $this->setAttribute($fieldName, $filePath);
            $this->syncOriginal();
        }

        return (bool) $updated;
    }

    /**
     * Mise à jour sécurisée de plusieurs champs de fichiers
     */
    public function updateFileFields(array $fileFields): bool
    {
        $validatedFields = [];

        foreach ($fileFields as $fieldName => $filePath) {
            // Vérifier que le champ est bien protégé
            if (!in_array($fieldName, $this->getProtectedFileFields())) {
                throw new \InvalidArgumentException("Le champ '$fieldName' n'est pas un champ de fichier protégé.");
            }

            // Valider le chemin de fichier
            if ($filePath !== null && ($filePath === '0' || $filePath === 'null' || trim($filePath) === '')) {
                throw new \InvalidArgumentException("Tentative d'assigner une valeur invalide ('$filePath') au champ de fichier '$fieldName'.");
            }

            $validatedFields[$fieldName] = $filePath;
        }

        // Utiliser le query builder direct pour bypasser complètement le trait
        $updated = static::where($this->getKeyName(), $this->getKey())
            ->update($validatedFields);

        if ($updated) {
            foreach ($validatedFields as $fieldName => $filePath) {
                $this->setAttribute($fieldName, $filePath);
            }
            $this->syncOriginal();
        }

        return (bool) $updated;
    }

    /**
     * Vérifie si un champ de fichier a une valeur valide
     */
    public function hasValidFileField(string $fieldName): bool
    {
        $value = $this->getAttribute($fieldName);
        
        return $value !== null && 
               $value !== '0' && 
               $value !== 'null' && 
               trim($value) !== '';
    }

    /**
     * Obtient la liste de tous les champs de fichiers corrompus pour cette instance
     */
    public function getCorruptedFileFields(): array
    {
        $corruptedFields = [];
        
        foreach ($this->getProtectedFileFields() as $field) {
            if (!$this->hasValidFileField($field) && $this->getAttribute($field) !== null) {
                $corruptedFields[] = [
                    'field' => $field,
                    'current_value' => $this->getAttribute($field)
                ];
            }
        }
        
        return $corruptedFields;
    }
}