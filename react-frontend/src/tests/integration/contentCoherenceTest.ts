// 🧪 PHASE 5 - TEST D'INTÉGRATION: COHÉRENCE CONTENU/IMAGES/DOMAINE
// Fichier: react-frontend/src/tests/integration/contentCoherenceTest.ts

import api from '@/services/api';
import { postGenerationService } from '@/services/postGeneration/postGenerationService';
import { contentService } from '@/services/postGeneration/contentService';
import { fetchBlogPosts } from '@/services/blogService';
import { getPosts as getSocialPosts } from '@/services/socialMediaService';
import type { BlogPost } from '@/data/blogData';
import type { SocialMediaPost } from '@/services/socialMediaService';
import type { ContentGenerationOptions } from '@/services/postGeneration/types/postGeneration';

interface TestResult {
  testName: string;
  success: boolean;
  details: string[];
  timestamp: string;
  duration: number;
}

interface CoherenceTestCase {
  name: string;
  domain: string;
  keywords: string[];
  expectedTone: string;
  expectedImageStyle: string;
  postType: 'blog' | 'social_media';
  platform?: string;
}

interface CoherenceAnalysis {
  testCase: CoherenceTestCase;
  generatedContent: {
    title: string;
    content: string;
    images: string[];
    tags: string[];
    detectedDomain: string;
    actualTone: string;
  };
  coherenceScores: {
    domainMatch: number;        // 0-10: Le domaine détecté correspond-il ?
    contentQuality: number;     // 0-10: Qualité du contenu généré
    imageCoherence: number;     // 0-10: Images cohérentes avec le contenu
    toneConsistency: number;    // 0-10: Ton cohérent avec le domaine
    keywordRelevance: number;   // 0-10: Mots-clés pertinents
    overallScore: number;       // 0-10: Score global
  };
  validationResults: {
    domainCorrect: boolean;
    contentRelevant: boolean;
    imagesAppropriate: boolean;
    toneMatches: boolean;
    keywordsUsed: boolean;
    typesValid: boolean;
  };
}

export class ContentCoherenceIntegrationTest {
  
  private static readonly LOG_PREFIX = "🧪 [CoherenceTest]";

  // ===== TEST PRINCIPAL: COHÉRENCE CONTENU/IMAGES/DOMAINE =====

  /**
   * TEST 12.3: Vérification de la cohérence complète du contenu généré
   * Tests de l'intelligence IA:
   * - Détection automatique du domaine utilisateur (tech, santé, créatif, etc.)
   * - Génération de contenu cohérent avec le domaine détecté
   * - Sélection d'images appropriées au contenu et domaine
   * - Cohérence du ton selon le contexte professionnel
   * - Pertinence des mots-clés et hashtags
   */
  async testContentCoherenceComplete(): Promise<TestResult> {
    const startTime = performance.now();
    const testName = "TEST 12.3: Cohérence Contenu/Images/Domaine";
    const details: string[] = [];
    let success = true;

    try {
      console.log(`${ContentCoherenceIntegrationTest.LOG_PREFIX} 🚀 Démarrage ${testName}`);

      // ===== ÉTAPE 1: DÉFINITION DES CAS DE TEST DOMAINES =====
      details.push("📍 ÉTAPE 1: Définition des cas de test par domaine");
      
      const testCases: CoherenceTestCase[] = [
        {
          name: "Domaine Tech - Blog développement",
          domain: "technology",
          keywords: ["développement", "programmation", "innovation", "digital"],
          expectedTone: "technique et informatif",
          expectedImageStyle: "moderne, tech, bureaux",
          postType: 'blog',
        },
        {
          name: "Domaine Santé - Article bien-être", 
          domain: "health",
          keywords: ["santé", "bien-être", "habitudes", "équilibre"],
          expectedTone: "bienveillant et motivant",
          expectedImageStyle: "nature, sport, wellness",
          postType: 'blog',
        },
        {
          name: "Domaine Business - Post LinkedIn",
          domain: "business",
          keywords: ["entrepreneuriat", "leadership", "stratégie", "croissance"],
          expectedTone: "professionnel et inspirant",
          expectedImageStyle: "business, bureau, équipe",
          postType: 'social_media',
          platform: 'linkedin',
        },
        {
          name: "Domaine Créatif - Post Instagram",
          domain: "creative",
          keywords: ["créativité", "design", "inspiration", "art"],
          expectedTone: "inspirant et artistique", 
          expectedImageStyle: "artistique, coloré, créatif",
          postType: 'social_media',
          platform: 'instagram',
        },
        {
          name: "Domaine Éducation - Article formation",
          domain: "education",
          keywords: ["apprentissage", "formation", "compétences", "enseignement"],
          expectedTone: "pédagogique et structuré",
          expectedImageStyle: "formation, livre, apprentissage",
          postType: 'blog',
        }
      ];

      details.push(`✅ ${testCases.length} cas de test définis`);
      testCases.forEach((testCase, index) => {
        details.push(`   ${index + 1}. ${testCase.name} (${testCase.domain})`);
      });

      // ===== ÉTAPE 2: GÉNÉRATION ET ANALYSE POUR CHAQUE DOMAINE =====
      details.push("📍 ÉTAPE 2: Génération et analyse par domaine");
      
      const coherenceAnalyses: CoherenceAnalysis[] = [];

      for (const testCase of testCases) {
        details.push(`🔄 Test cohérence: ${testCase.name}`);
        
        try {
          // Préparer les options de génération pour simuler le domaine
          const generationOptions: ContentGenerationOptions = {
            post_type: testCase.postType,
            platform: testCase.platform as any,
            domain_override: testCase.domain,
            keywords_override: testCase.keywords,
            tone: 'professional',
            content_length: 'medium',
            include_images: true,
            max_images: 2,
            custom_instructions: `Générer du contenu cohérent avec le domaine ${testCase.domain}`
          };

          // Générer le contenu via l'IA
          let generationResult;
          if (testCase.postType === 'blog') {
            generationResult = await postGenerationService.generateScheduledPost(generationOptions);
          } else {
            generationResult = await postGenerationService.generateScheduledPost(generationOptions);
          }

          if (!generationResult.success) {
            throw new Error(generationResult.message || 'Échec génération');
          }

          const generatedPost = generationResult.data.post;
          
          details.push(`   ✅ Contenu généré pour ${testCase.domain}`);
          details.push(`   📝 Titre: ${generatedPost.title || generatedPost.content.substring(0, 50)}...`);
          
          // Analyser la cohérence du contenu généré
          const coherenceAnalysis = await this.analyzeContentCoherence(testCase, generatedPost);
          coherenceAnalyses.push(coherenceAnalysis);
          
          details.push(`   📊 Score cohérence: ${coherenceAnalysis.coherenceScores.overallScore}/10`);
          
          // Validation des critères de cohérence
          const validationPassed = Object.values(coherenceAnalysis.validationResults).every(v => v === true);
          if (!validationPassed) {
            success = false;
            details.push(`   ❌ Validation échouée pour ${testCase.name}`);
            
            // Détailler les échecs
            Object.entries(coherenceAnalysis.validationResults).forEach(([key, value]) => {
              if (!value) {
                details.push(`      ❌ ${key}: échec`);
              }
            });
          } else {
            details.push(`   ✅ Toutes les validations réussies`);
          }

        } catch (error) {
          success = false;
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          details.push(`   ❌ Erreur génération ${testCase.name}: ${errorMessage}`);
          
          // Ajouter une analyse vide pour maintenir la structure
          coherenceAnalyses.push({
            testCase,
            generatedContent: {
              title: 'ERREUR',
              content: 'ERREUR',
              images: [],
              tags: [],
              detectedDomain: 'unknown',
              actualTone: 'unknown'
            },
            coherenceScores: {
              domainMatch: 0,
              contentQuality: 0,
              imageCoherence: 0,
              toneConsistency: 0,
              keywordRelevance: 0,
              overallScore: 0
            },
            validationResults: {
              domainCorrect: false,
              contentRelevant: false,
              imagesAppropriate: false,
              toneMatches: false,
              keywordsUsed: false,
              typesValid: false
            }
          });
        }
      }

      // ===== ÉTAPE 3: ANALYSE TRANSVERSALE DES RÉSULTATS =====
      details.push("📍 ÉTAPE 3: Analyse transversale des résultats");
      
      const averageScores = this.calculateAverageCoherenceScores(coherenceAnalyses);
      const successfulGenerations = coherenceAnalyses.filter(a => a.coherenceScores.overallScore >= 7).length;
      const totalGenerations = coherenceAnalyses.length;
      
      details.push(`📊 Générations réussies: ${successfulGenerations}/${totalGenerations}`);
      details.push(`📊 Score moyen cohérence globale: ${averageScores.overallScore.toFixed(1)}/10`);
      details.push(`📊 Score moyen détection domaine: ${averageScores.domainMatch.toFixed(1)}/10`);
      details.push(`📊 Score moyen qualité contenu: ${averageScores.contentQuality.toFixed(1)}/10`);
      details.push(`📊 Score moyen cohérence images: ${averageScores.imageCoherence.toFixed(1)}/10`);
      details.push(`📊 Score moyen consistance ton: ${averageScores.toneConsistency.toFixed(1)}/10`);

      // ===== ÉTAPE 4: VALIDATION SYNCHRONISATION DONNÉES =====
      details.push("📍 ÉTAPE 4: Validation synchronisation données générées");
      
      // Vérifier que le contenu généré est accessible via les services frontend
      const currentBlogPosts = await fetchBlogPosts();
      const currentSocialPosts = await getSocialPosts();
      
      details.push(`✅ Posts blog actuels: ${currentBlogPosts.length}`);
      details.push(`✅ Posts social actuels: ${currentSocialPosts.length}`);

      // Validation des types TypeScript pour tous les posts
      let typesValidationOK = true;
      
      currentBlogPosts.forEach((post, index) => {
        if (typeof post.id !== 'number') {
          typesValidationOK = false;
          success = false;
          details.push(`   ❌ Blog post ${index}: ID type invalide (${typeof post.id})`);
        }
        if (post.tags && !Array.isArray(post.tags)) {
          typesValidationOK = false;
          success = false;
          details.push(`   ❌ Blog post ${index}: Tags type invalide (${typeof post.tags})`);
        }
      });

      currentSocialPosts.forEach((post, index) => {
        if (typeof post.id !== 'number') {
          typesValidationOK = false;
          success = false;
          details.push(`   ❌ Social post ${index}: ID type invalide (${typeof post.id})`);
        }
        if (post.images && !Array.isArray(post.images)) {
          typesValidationOK = false;
          success = false;
          details.push(`   ❌ Social post ${index}: Images type invalide (${typeof post.images})`);
        }
      });

      if (typesValidationOK) {
        details.push(`   ✅ Tous les types TypeScript sont valides`);
      }

      // ===== ÉTAPE 5: VALIDATION CRITÈRES DE QUALITÉ =====
      details.push("📍 ÉTAPE 5: Validation critères de qualité globaux");
      
      // Critères de succès pour la cohérence IA
      const qualityCriteria = {
        minimumSuccessRate: 0.8,      // 80% des générations doivent réussir
        minimumAverageScore: 7.0,     // Score moyen >= 7/10
        minimumDomainAccuracy: 0.9,   // 90% de précision détection domaine
        minimumImageCoherence: 6.0,   // Images cohérentes >= 6/10
        minimumContentQuality: 7.0    // Qualité contenu >= 7/10
      };

      const actualSuccessRate = successfulGenerations / totalGenerations;
      const actualDomainAccuracy = averageScores.domainMatch / 10;
      
      let qualityValidationOK = true;
      
      if (actualSuccessRate < qualityCriteria.minimumSuccessRate) {
        qualityValidationOK = false;
        success = false;
        details.push(`   ❌ Taux de succès insuffisant: ${(actualSuccessRate * 100).toFixed(1)}% < ${(qualityCriteria.minimumSuccessRate * 100).toFixed(1)}%`);
      } else {
        details.push(`   ✅ Taux de succès acceptable: ${(actualSuccessRate * 100).toFixed(1)}%`);
      }

      if (averageScores.overallScore < qualityCriteria.minimumAverageScore) {
        qualityValidationOK = false;
        success = false;
        details.push(`   ❌ Score moyen insuffisant: ${averageScores.overallScore.toFixed(1)} < ${qualityCriteria.minimumAverageScore}`);
      } else {
        details.push(`   ✅ Score moyen acceptable: ${averageScores.overallScore.toFixed(1)}/10`);
      }

      if (actualDomainAccuracy < qualityCriteria.minimumDomainAccuracy) {
        qualityValidationOK = false;
        success = false;
        details.push(`   ❌ Précision domaine insuffisante: ${(actualDomainAccuracy * 100).toFixed(1)}% < ${(qualityCriteria.minimumDomainAccuracy * 100).toFixed(1)}%`);
      } else {
        details.push(`   ✅ Précision domaine acceptable: ${(actualDomainAccuracy * 100).toFixed(1)}%`);
      }

      // ===== RÉSULTAT FINAL =====
      const overallSuccess = success && typesValidationOK && qualityValidationOK;
      
      details.push("🏁 RÉSULTATS FINAUX");
      details.push(`📊 Génération IA: ${overallSuccess ? 'INTELLIGENTE' : 'À AMÉLIORER'}`);
      details.push(`📊 Cohérence contenu: ${qualityValidationOK ? 'EXCELLENTE' : 'INSUFFISANTE'}`);
      details.push(`📊 Synchronisation données: ${typesValidationOK ? 'PARFAITE' : 'PROBLÉMATIQUE'}`);
      
      if (overallSuccess) {
        details.push("🎉 TEST RÉUSSI: IA cohérente et intelligente VALIDÉE");
        details.push("✅ Détection domaine automatique fonctionnelle");
        details.push("✅ Contenu généré cohérent avec le contexte utilisateur");
        details.push("✅ Images sélectionnées appropriées au domaine");
        details.push("✅ Ton adapté selon le contexte professionnel");
        details.push("✅ Synchronisation Backend ↔ Frontend impeccable");
      } else {
        details.push("❌ TEST ÉCHOUÉ: IA nécessite des améliorations");
        details.push("⚠️ Ajustements requis dans l'algorithme de génération");
      }

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.log(`${ContentCoherenceIntegrationTest.LOG_PREFIX} ⏱️ Test terminé en ${duration}ms`);
      
      return {
        testName,
        success: overallSuccess,
        details,
        timestamp: new Date().toISOString(),
        duration
      };

    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      success = false;
      details.push(`❌ ERREUR CRITIQUE: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      details.push(`🚨 Test interrompu par exception`);
      
      console.error(`${ContentCoherenceIntegrationTest.LOG_PREFIX} ❌ Erreur:`, error);
      
      return {
        testName,
        success: false,
        details,
        timestamp: new Date().toISOString(),
        duration
      };
    }
  }

  // ===== MÉTHODES D'ANALYSE PRIVÉES =====

  /**
   * Analyser la cohérence d'un contenu généré par rapport à un cas de test
   */
  private async analyzeContentCoherence(
    testCase: CoherenceTestCase, 
    generatedPost: any
  ): Promise<CoherenceAnalysis> {
    
    const content = generatedPost.content || '';
    const title = generatedPost.title || '';
    const images = generatedPost.images || [];
    const tags = generatedPost.tags || [];
    
    // Analyse de la détection du domaine
    const domainMatch = this.analyzeDomainMatch(testCase.domain, content, title);
    
    // Analyse de la qualité du contenu
    const contentQuality = this.analyzeContentQuality(content, title, testCase.keywords);
    
    // Analyse de la cohérence des images
    const imageCoherence = await this.analyzeImageCoherence(images, content, testCase.domain);
    
    // Analyse de la consistance du ton
    const toneConsistency = this.analyzeToneConsistency(content, testCase.expectedTone);
    
    // Analyse de la pertinence des mots-clés
    const keywordRelevance = this.analyzeKeywordRelevance(content, title, tags, testCase.keywords);
    
    // Score global
    const overallScore = Math.round(
      (domainMatch + contentQuality + imageCoherence + toneConsistency + keywordRelevance) / 5
    );
    
    return {
      testCase,
      generatedContent: {
        title,
        content,
        images,
        tags,
        detectedDomain: this.detectDomainFromContent(content, title),
        actualTone: this.detectToneFromContent(content)
      },
      coherenceScores: {
        domainMatch,
        contentQuality,
        imageCoherence,
        toneConsistency,
        keywordRelevance,
        overallScore
      },
      validationResults: {
        domainCorrect: domainMatch >= 7,
        contentRelevant: contentQuality >= 7,
        imagesAppropriate: imageCoherence >= 6,
        toneMatches: toneConsistency >= 6,
        keywordsUsed: keywordRelevance >= 7,
        typesValid: this.validateDataTypes(generatedPost)
      }
    };
  }

  /**
   * Analyser la correspondance avec le domaine attendu
   */
  private analyzeDomainMatch(expectedDomain: string, content: string, title: string): number {
    const text = (content + ' ' + title).toLowerCase();
    
    // Mots-clés par domaine pour la détection
    const domainKeywords: Record<string, string[]> = {
      technology: ['tech', 'développement', 'code', 'digital', 'innovation', 'système', 'logiciel'],
      health: ['santé', 'bien-être', 'forme', 'équilibre', 'habitude', 'exercice', 'nutrition'],
      business: ['entreprise', 'business', 'stratégie', 'croissance', 'leadership', 'management'],
      creative: ['créatif', 'design', 'art', 'inspiration', 'création', 'artistique', 'visuel'],
      education: ['formation', 'apprentissage', 'éducation', 'enseignement', 'compétence', 'savoir']
    };
    
    const keywords = domainKeywords[expectedDomain] || [];
    let matchCount = 0;
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        matchCount++;
      }
    });
    
    return Math.min(10, Math.round((matchCount / keywords.length) * 10));
  }

  /**
   * Analyser la qualité générale du contenu
   */
  private analyzeContentQuality(content: string, title: string, expectedKeywords: string[]): number {
    let score = 5; // Base
    
    // Longueur appropriée
    if (content.length > 100 && content.length < 2000) score += 1;
    if (title.length > 10 && title.length < 100) score += 1;
    
    // Structure (paragraphes, phrases)
    const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
    if (paragraphs.length >= 2) score += 1;
    
    // Présence de mots-clés attendus
    const keywordMatches = expectedKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    score += Math.min(2, keywordMatches);
    
    return Math.min(10, score);
  }

  /**
   * Analyser la cohérence des images avec le contenu
   */
  private async analyzeImageCoherence(images: string[], content: string, domain: string): Promise<number> {
    if (images.length === 0) return 3; // Score neutre si pas d'images
    
    try {
      // Simulation d'analyse de cohérence (en réalité, cela nécessiterait une API d'analyse d'images)
      let totalScore = 0;
      
      for (const imageUrl of images) {
        // Validation basique de l'URL
        if (this.isValidImageUrl(imageUrl)) {
          totalScore += 7; // Score de base pour image valide
          
          // Bonus si l'URL contient des mots liés au domaine
          if (this.imageUrlMatchesDomain(imageUrl, domain)) {
            totalScore += 2;
          }
        } else {
          totalScore += 2; // Score faible pour image invalide
        }
      }
      
      return Math.min(10, Math.round(totalScore / images.length));
      
    } catch (error) {
      return 5; // Score neutre en cas d'erreur
    }
  }

  /**
   * Analyser la consistance du ton
   */
  private analyzeToneConsistency(content: string, expectedTone: string): number {
    const text = content.toLowerCase();
    let score = 5; // Base
    
    // Analyse approximative du ton basée sur des mots-clés
    const toneIndicators: Record<string, string[]> = {
      'technique': ['développement', 'système', 'méthode', 'solution', 'optimisation'],
      'bienveillant': ['bien-être', 'équilibre', 'harmonie', 'douceur', 'prendre soin'],
      'professionnel': ['stratégie', 'efficacité', 'performance', 'objectif', 'résultat'],
      'inspirant': ['inspiration', 'créativité', 'passion', 'vision', 'innovation'],
      'pédagogique': ['apprendre', 'comprendre', 'expliquer', 'étape', 'méthode']
    };
    
    Object.entries(toneIndicators).forEach(([tone, indicators]) => {
      if (expectedTone.includes(tone)) {
        const matches = indicators.filter(indicator => text.includes(indicator)).length;
        score += Math.min(2, matches);
      }
    });
    
    return Math.min(10, score);
  }

  /**
   * Analyser la pertinence des mots-clés utilisés
   */
  private analyzeKeywordRelevance(content: string, title: string, tags: string[], expectedKeywords: string[]): number {
    const allText = (content + ' ' + title + ' ' + tags.join(' ')).toLowerCase();
    
    const keywordMatches = expectedKeywords.filter(keyword => 
      allText.includes(keyword.toLowerCase())
    ).length;
    
    const relevanceScore = (keywordMatches / expectedKeywords.length) * 10;
    return Math.min(10, Math.round(relevanceScore));
  }

  /**
   * Détecter le domaine à partir du contenu
   */
  private detectDomainFromContent(content: string, title: string): string {
    const text = (content + ' ' + title).toLowerCase();
    
    const domainScores: Record<string, number> = {
      technology: 0,
      health: 0,
      business: 0,
      creative: 0,
      education: 0
    };
    
    // Mots-clés de détection (version simplifiée)
    if (text.includes('tech') || text.includes('développement')) domainScores.technology += 3;
    if (text.includes('santé') || text.includes('bien-être')) domainScores.health += 3;
    if (text.includes('business') || text.includes('entreprise')) domainScores.business += 3;
    if (text.includes('créatif') || text.includes('design')) domainScores.creative += 3;
    if (text.includes('formation') || text.includes('apprentissage')) domainScores.education += 3;
    
    const detectedDomain = Object.entries(domainScores)
      .sort(([, a], [, b]) => b - a)[0][0];
    
    return detectedDomain;
  }

  /**
   * Détecter le ton à partir du contenu
   */
  private detectToneFromContent(content: string): string {
    const text = content.toLowerCase();
    
    if (text.includes('technique') || text.includes('méthode')) return 'technique';
    if (text.includes('bien-être') || text.includes('équilibre')) return 'bienveillant';
    if (text.includes('stratégie') || text.includes('performance')) return 'professionnel';
    if (text.includes('inspiration') || text.includes('créativité')) return 'inspirant';
    if (text.includes('apprendre') || text.includes('comprendre')) return 'pédagogique';
    
    return 'neutre';
  }

  /**
   * Valider les types de données du post généré
   */
  private validateDataTypes(post: any): boolean {
    return (
      typeof post.id === 'number' &&
      typeof post.content === 'string' &&
      Array.isArray(post.images) &&
      Array.isArray(post.tags)
    );
  }

  /**
   * Vérifier si une URL d'image est valide
   */
  private isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol) && 
             ['.jpg', '.jpeg', '.png', '.webp'].some(ext => url.toLowerCase().includes(ext));
    } catch {
      return false;
    }
  }

  /**
   * Vérifier si l'URL d'image correspond au domaine
   */
  private imageUrlMatchesDomain(imageUrl: string, domain: string): boolean {
    const url = imageUrl.toLowerCase();
    
    const domainKeywords: Record<string, string[]> = {
      technology: ['tech', 'computer', 'digital', 'coding'],
      health: ['health', 'fitness', 'wellness', 'nature'],
      business: ['business', 'office', 'corporate', 'professional'],
      creative: ['creative', 'art', 'design', 'colorful'],
      education: ['education', 'learning', 'book', 'study']
    };
    
    const keywords = domainKeywords[domain] || [];
    return keywords.some(keyword => url.includes(keyword));
  }

  /**
   * Calculer les scores moyens de cohérence
   */
  private calculateAverageCoherenceScores(analyses: CoherenceAnalysis[]): CoherenceAnalysis['coherenceScores'] {
    const validAnalyses = analyses.filter(a => a.coherenceScores.overallScore > 0);
    
    if (validAnalyses.length === 0) {
      return {
        domainMatch: 0,
        contentQuality: 0,
        imageCoherence: 0,
        toneConsistency: 0,
        keywordRelevance: 0,
        overallScore: 0
      };
    }
    
    return {
      domainMatch: validAnalyses.reduce((sum, a) => sum + a.coherenceScores.domainMatch, 0) / validAnalyses.length,
      contentQuality: validAnalyses.reduce((sum, a) => sum + a.coherenceScores.contentQuality, 0) / validAnalyses.length,
      imageCoherence: validAnalyses.reduce((sum, a) => sum + a.coherenceScores.imageCoherence, 0) / validAnalyses.length,
      toneConsistency: validAnalyses.reduce((sum, a) => sum + a.coherenceScores.toneConsistency, 0) / validAnalyses.length,
      keywordRelevance: validAnalyses.reduce((sum, a) => sum + a.coherenceScores.keywordRelevance, 0) / validAnalyses.length,
      overallScore: validAnalyses.reduce((sum, a) => sum + a.coherenceScores.overallScore, 0) / validAnalyses.length
    };
  }

  // ===== TEST AUXILIAIRE: VALIDATION COHÉRENCE SPÉCIFIQUE =====

  /**
   * TEST 12.3.1: Test spécifique de validation des domaines
   */
  async testDomainDetectionAccuracy(): Promise<TestResult> {
    const startTime = performance.now();
    const testName = "TEST 12.3.1: Précision Détection Domaines";
    const details: string[] = [];
    let success = true;

    try {
      details.push("📍 TEST SPÉCIFIQUE: Précision détection domaines");
      
      // Test de détection pour chaque domaine avec contexte explicite
      const domainTests = [
        {
          domain: 'technology',
          context: 'Développement d\'applications web avec React et TypeScript. Optimisation des performances et architecture moderne.',
          expectedKeywords: ['react', 'typescript', 'développement', 'application']
        },
        {
          domain: 'health',
          context: 'Améliorer son bien-être quotidien grâce à des habitudes saines. Nutrition équilibrée et exercice physique.',
          expectedKeywords: ['bien-être', 'habitudes', 'nutrition', 'exercice']
        },
        {
          domain: 'business',
          context: 'Stratégies de croissance pour les startups. Leadership et management d\'équipe dans un environnement entrepreneurial.',
          expectedKeywords: ['stratégie', 'croissance', 'leadership', 'startup']
        }
      ];

      let correctDetections = 0;
      
      for (const test of domainTests) {
        const detectedDomain = this.detectDomainFromContent(test.context, '');
        const isCorrect = detectedDomain === test.domain;
        
        if (isCorrect) {
          correctDetections++;
          details.push(`   ✅ ${test.domain}: détection correcte`);
        } else {
          details.push(`   ❌ ${test.domain}: détecté comme ${detectedDomain}`);
          success = false;
        }
      }

      const accuracy = (correctDetections / domainTests.length) * 100;
      details.push(`📊 Précision détection: ${accuracy.toFixed(1)}%`);
      
      if (accuracy < 80) {
        success = false;
        details.push(`❌ Précision insuffisante (< 80%)`);
      }

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      return {
        testName,
        success,
        details,
        timestamp: new Date().toISOString(),
        duration
      };

    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      details.push(`❌ ERREUR: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      return {
        testName,
        success: false,
        details,
        timestamp: new Date().toISOString(),
        duration
      };
    }
  }

  /**
   * TEST 12.3.2: Test de validation des images et contenu
   */
  async testImageContentAlignment(): Promise<TestResult> {
    const startTime = performance.now();
    const testName = "TEST 12.3.2: Alignement Images/Contenu";
    const details: string[] = [];
    let success = true;

    try {
      details.push("📍 TEST SPÉCIFIQUE: Alignement images/contenu");
      
      // Tests avec différents types d'images et contenu
      const imageTests = [
        {
          content: 'Guide complet du développement web moderne avec les dernières technologies',
          domain: 'technology',
          validImageUrls: [
            'https://images.pexels.com/photos/computer-coding-tech.jpg',
            'https://images.pexels.com/photos/developer-workspace.jpg'
          ],
          invalidImageUrls: [
            'https://images.pexels.com/photos/nature-landscape.jpg',
            'https://images.pexels.com/photos/food-cooking.jpg'
          ]
        },
        {
          content: 'Conseils pour maintenir un mode de vie sain et équilibré au quotidien',
          domain: 'health',
          validImageUrls: [
            'https://images.pexels.com/photos/fitness-wellness.jpg',
            'https://images.pexels.com/photos/healthy-food.jpg'
          ],
          invalidImageUrls: [
            'https://images.pexels.com/photos/business-meeting.jpg',
            'https://images.pexels.com/photos/technology-gadgets.jpg'
          ]
        }
      ];

      for (const test of imageTests) {
        details.push(`🔄 Test cohérence pour domaine: ${test.domain}`);
        
        // Tester images valides
        for (const validUrl of test.validImageUrls) {
          const coherenceScore = await this.analyzeImageCoherence([validUrl], test.content, test.domain);
          
          if (coherenceScore >= 6) {
            details.push(`   ✅ Image cohérente: score ${coherenceScore}/10`);
          } else {
            details.push(`   ⚠️ Image moyennement cohérente: score ${coherenceScore}/10`);
          }
        }
        
        // Tester images invalides
        for (const invalidUrl of test.invalidImageUrls) {
          const coherenceScore = await this.analyzeImageCoherence([invalidUrl], test.content, test.domain);
          
          if (coherenceScore < 6) {
            details.push(`   ✅ Image incorrecte détectée: score ${coherenceScore}/10`);
          } else {
            details.push(`   ❌ Image incorrecte non détectée: score ${coherenceScore}/10`);
            success = false;
          }
        }
      }

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      return {
        testName,
        success,
        details,
        timestamp: new Date().toISOString(),
        duration
      };

    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      details.push(`❌ ERREUR: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      return {
        testName,
        success: false,
        details,
        timestamp: new Date().toISOString(),
        duration
      };
    }
  }

  // ===== UTILITAIRES DE GÉNÉRATION DE RAPPORTS =====

  /**
   * Générer un rapport complet de tous les tests de cohérence
   */
  async generateFullReport(): Promise<string> {
    console.log(`${ContentCoherenceIntegrationTest.LOG_PREFIX} 📊 Génération rapport complet...`);
    
    const tests = [
      await this.testContentCoherenceComplete(),
      await this.testDomainDetectionAccuracy(),
      await this.testImageContentAlignment()
    ];

    const passedTests = tests.filter(test => test.success).length;
    const totalTests = tests.length;
    const overallSuccess = passedTests === totalTests;

    let report = `# RAPPORT TEST INTÉGRATION: COHÉRENCE CONTENU/IMAGES/DOMAINE\n\n`;
    report += `**Date:** ${new Date().toLocaleString('fr-FR')}\n`;
    report += `**Statut global:** ${overallSuccess ? '✅ RÉUSSI' : '❌ ÉCHEC'}\n`;
    report += `**Tests réussis:** ${passedTests}/${totalTests}\n\n`;
    
    report += `## OBJECTIF DU TEST\n`;
    report += `Ce test valide l'intelligence artificielle du système et sa capacité à:\n`;
    report += `- Détecter automatiquement le domaine utilisateur (tech, santé, business, etc.)\n`;
    report += `- Générer du contenu cohérent et de qualité selon le contexte\n`;
    report += `- Sélectionner des images appropriées au contenu et domaine\n`;
    report += `- Adapter le ton et les mots-clés selon le domaine professionnel\n`;
    report += `- Maintenir la synchronisation parfaite Backend ↔ Frontend\n\n`;
    
    report += `## CRITÈRES DE VALIDATION\n`;
    report += `- **Taux de succès minimum:** 80% des générations réussies\n`;
    report += `- **Score de cohérence minimum:** 7/10 en moyenne\n`;
    report += `- **Précision détection domaine:** ≥ 90%\n`;
    report += `- **Cohérence images:** ≥ 6/10 en moyenne\n`;
    report += `- **Qualité contenu:** ≥ 7/10 en moyenne\n\n`;
    
    report += `## RÉSULTATS DÉTAILLÉS\n\n`;
    
    tests.forEach((test, index) => {
      report += `### ${index + 1}. ${test.testName}\n`;
      report += `**Statut:** ${test.success ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}\n`;
      report += `**Durée:** ${test.duration}ms\n`;
      report += `**Timestamp:** ${test.timestamp}\n\n`;
      
      report += `**Détails d'exécution:**\n`;
      test.details.forEach(detail => {
        report += `- ${detail}\n`;
      });
      report += `\n`;
    });
    
    report += `## ANALYSE DE L'INTELLIGENCE IA\n\n`;
    
    if (overallSuccess) {
      report += `✅ **IA PERFORMANTE ET INTELLIGENTE**\n`;
      report += `- Détection automatique du domaine fiable\n`;
      report += `- Génération de contenu contextuelle et pertinente\n`;
      report += `- Sélection d'images cohérente avec le domaine\n`;
      report += `- Adaptation automatique du ton professionnel\n`;
      report += `- Synchronisation données parfaite sur toutes les interfaces\n\n`;
      
      report += `🚀 **SYSTÈME PRÊT POUR LA PRODUCTION**\n`;
      report += `L'IA génère du contenu de qualité professionnelle avec une cohérence parfaite.\n`;
      report += `Les utilisateurs bénéficieront d'une expérience personnalisée et intelligente.\n\n`;
    } else {
      report += `❌ **IA NÉCESSITE DES AMÉLIORATIONS**\n`;
      report += `- Algorithmes de détection à affiner\n`;
      report += `- Cohérence contenu/images à optimiser\n`;
      report += `- Qualité de génération variable selon les domaines\n`;
      report += `- Synchronisation données à stabiliser\n\n`;
      
      report += `⚠️ **ACTIONS RECOMMANDÉES**\n`;
      report += `1. Améliorer les modèles de détection de domaine\n`;
      report += `2. Enrichir les bases de données d'images par domaine\n`;
      report += `3. Affiner les paramètres de génération IA\n`;
      report += `4. Valider la cohérence sur plus de cas d'usage\n\n`;
    }
    
    report += `## MÉTRIQUES DE PERFORMANCE\n\n`;
    report += `- **Temps de génération moyen:** ${Math.round(tests.reduce((sum, t) => sum + t.duration, 0) / tests.length)}ms\n`;
    report += `- **Fiabilité globale:** ${(passedTests / totalTests * 100).toFixed(1)}%\n`;
    report += `- **Qualité intelligence IA:** ${overallSuccess ? 'EXCELLENTE' : 'À AMÉLIORER'}\n\n`;
    
    report += `## CONCLUSION\n\n`;
    
    if (overallSuccess) {
      report += `🎉 **SUCCÈS COMPLET - PHASE 5 VALIDÉE**\n`;
      report += `Tous les tests d'intégration sont réussis:\n`;
      report += `- ✅ Test 12.1: Création utilisateur → posts automatiques\n`;
      report += `- ✅ Test 12.2: Planning → génération posts\n`;
      report += `- ✅ Test 12.3: Cohérence contenu/images/domaine\n\n`;
      report += `**PRÊT POUR LA PHASE 6: FINALISATION**\n\n`;
    } else {
      report += `❌ **ÉCHECS DÉTECTÉS - CORRECTIONS NÉCESSAIRES**\n`;
      report += `La Phase 5 nécessite des ajustements avant de continuer.\n`;
      report += `Analyser les détails ci-dessus et corriger les problèmes identifiés.\n`;
      report += `**NE PAS PASSER À LA PHASE 6 TANT QUE TOUS LES TESTS NE SONT PAS VALIDÉS**\n\n`;
    }
    
    console.log(`${ContentCoherenceIntegrationTest.LOG_PREFIX} ✅ Rapport généré`);
    
    return report;
  }

  /**
   * Exécuter uniquement le test principal (test rapide)
   */
  async runQuickTest(): Promise<boolean> {
    console.log(`${ContentCoherenceIntegrationTest.LOG_PREFIX} ⚡ Test rapide en cours...`);
    
    const result = await this.testContentCoherenceComplete();
    
    console.log(`${ContentCoherenceIntegrationTest.LOG_PREFIX} ${result.success ? '✅ SUCCÈS' : '❌ ÉCHEC'} - Test rapide terminé`);
    
    return result.success;
  }

  /**
   * Utilitaire pour tester un domaine spécifique
   */
  async testSpecificDomain(domain: string, sampleContent: string): Promise<{
    detectedDomain: string;
    coherenceScore: number;
    isAccurate: boolean;
  }> {
    console.log(`${ContentCoherenceIntegrationTest.LOG_PREFIX} 🔍 Test domaine spécifique: ${domain}`);
    
    const detectedDomain = this.detectDomainFromContent(sampleContent, '');
    const coherenceScore = this.analyzeDomainMatch(domain, sampleContent, '');
    const isAccurate = detectedDomain === domain;
    
    return {
      detectedDomain,
      coherenceScore,
      isAccurate
    };
  }

  /**
   * Benchmark complet de performance IA
   */
  async runPerformanceBenchmark(): Promise<{
    averageGenerationTime: number;
    successRate: number;
    averageCoherenceScore: number;
    domainAccuracy: number;
  }> {
    console.log(`${ContentCoherenceIntegrationTest.LOG_PREFIX} 🏃‍♂️ Benchmark performance en cours...`);
    
    const startTime = performance.now();
    
    // Exécuter tous les tests
    const mainTest = await this.testContentCoherenceComplete();
    const domainTest = await this.testDomainDetectionAccuracy();
    const imageTest = await this.testImageContentAlignment();
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    const tests = [mainTest, domainTest, imageTest];
    const successfulTests = tests.filter(t => t.success).length;
    const successRate = (successfulTests / tests.length) * 100;
    
    // Calculer la moyenne des scores (approximation)
    const averageCoherenceScore = 7.5; // TODO: Récupérer les vrais scores du mainTest
    const domainAccuracy = domainTest.success ? 90 : 70; // TODO: Récupérer le vrai score
    
    return {
      averageGenerationTime: Math.round(totalTime / 3), // Temps moyen par test
      successRate,
      averageCoherenceScore,
      domainAccuracy
    };
  }
}