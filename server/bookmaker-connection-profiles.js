// Deck Pro V2 — per-bookmaker connection profiles.
// IMPORTANT: these profiles define the minimum credential UI for each bookmaker.
// They do NOT invent private endpoints or bypass bookmaker security.
// Automatic placement is enabled only when a documented/authorized execution
// contract is configured for that bookmaker.

const profile = (slug, name, method, fields, notes, execution='not_verified') => ({
  slug, name, method, fields, notes, execution
});

const profiles = {
  sportybet: profile('sportybet','SportyBet','partner_or_authorized_api',[
    {key:'accessToken',label:'Jeton d’accès autorisé',type:'secret',required:true}
  ],'Connexion d’exécution à confirmer auprès du canal partenaire/API officiel.'),
  betmomo: profile('betmomo','BetMomo','official_credentials_or_partner',[
    {key:'identifier',label:'Identifiant / numéro du compte',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Le canal exact de placement automatique doit être contractuellement vérifié.'),
  premierbet: profile('premierbet','Premier Bet','deeplink_or_partner',[
    {key:'identifier',label:'Identifiant du compte',type:'text',required:true}
  ],'Le deeplink/Share-Bet peut préparer un coupon; le placement automatique nécessite un canal autorisé.', 'manual_or_deeplink'),
  'betpawa.cm': profile('betpawa.cm','betPawa Cameroon','account_or_authorized_partner',[
    {key:'identifier',label:'Numéro de compte / téléphone',type:'text',required:true},
    {key:'pin',label:'PIN',type:'password',required:true}
  ],'betPawa expose un parcours joueur et pawaTech fournit la technologie B2B; le canal de placement tiers doit être autorisé.'),
  '1xbet': profile('1xbet','1xBet','authorized_token_or_partner',[
    {key:'accessToken',label:'Token d’accès autorisé',type:'secret',required:true}
  ],'Le canal token/API doit être fourni par un accès autorisé; aucun token intercepté ou extrait ne sera utilisé.'),
  '1xwin': profile('1xwin','1xWin','partner_or_official_credentials',[
    {key:'identifier',label:'Identifiant du compte',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Canal d’exécution automatique à confirmer avant activation.'),
  afropari: profile('afropari','Afropari','partner_or_official_credentials',[
    {key:'identifier',label:'Identifiant du compte',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Canal d’exécution automatique à confirmer avant activation.'),
  betclic: profile('betclic','Betclic','official_credentials_or_partner',[
    {key:'identifier',label:'Identifiant / e-mail',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Une connexion joueur n’implique pas à elle seule une API de placement tiers.'),
  yellowbet: profile('yellowbet','Yellow Bet','official_credentials_or_partner',[
    {key:'identifier',label:'Identifiant du compte',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Canal d’exécution automatique à confirmer avant activation.'),
  '22bet': profile('22bet','22Bet','official_credentials_or_partner',[
    {key:'identifier',label:'Identifiant / e-mail',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Canal d’exécution automatique à confirmer avant activation.'),
  pmuc: profile('pmuc','PMUC','official_credentials_or_partner',[
    {key:'identifier',label:'Identifiant du compte',type:'text',required:true}
  ],'Canal d’exécution tiers à confirmer.'),
  supergooal: profile('supergooal','Supergooal','official_credentials_or_partner',[
    {key:'identifier',label:'Identifiant du compte',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Canal d’exécution automatique à confirmer avant activation.'),
  betwinner: profile('betwinner','BetWinner','official_credentials_or_partner',[
    {key:'identifier',label:'Identifiant / e-mail',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Canal d’exécution automatique à confirmer avant activation.'),
  melbet: profile('melbet','Melbet','official_credentials_or_partner',[
    {key:'identifier',label:'Identifiant / e-mail',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Canal d’exécution automatique à confirmer avant activation.'),
  bettomax: profile('bettomax','Bettomax','official_credentials_or_partner',[
    {key:'identifier',label:'Identifiant du compte',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Canal d’exécution automatique à confirmer avant activation.'),
  paripesa: profile('paripesa','PariPesa','official_credentials_or_partner',[
    {key:'identifier',label:'Identifiant / e-mail',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Canal d’exécution automatique à confirmer avant activation.'),
  onebet: profile('onebet','OneBet','official_credentials_or_partner',[
    {key:'identifier',label:'Identifiant du compte',type:'text',required:true},
    {key:'password',label:'Mot de passe',type:'password',required:true}
  ],'Canal d’exécution automatique à confirmer avant activation.'),
  betsson: profile('betsson','Betsson Africa','authorized_partner_api',[
    {key:'accessToken',label:'Jeton d’accès autorisé',type:'secret',required:true}
  ],'Betsson Africa Cameroon est opéré sur une plateforme EveryMatrix; l’accès d’exécution tiers doit être contractualisé/autorisé.', 'not_verified')
};

export function getBookmakerConnectionProfile(slug) {
  return profiles[String(slug || '').trim().toLowerCase()] || null;
}

export function listBookmakerConnectionProfiles() {
  return Object.values(profiles).map(p => ({...p, fields:p.fields.map(({key,label,type,required})=>({key,label,type,required}))}));
}

export function requiredCredentialKeys(slug) {
  return (getBookmakerConnectionProfile(slug)?.fields || []).filter(f => f.required).map(f => f.key);
}

export function validateCredentialShape(slug, credentials={}) {
  const p = getBookmakerConnectionProfile(slug);
  if (!p) return {ok:false,error:'BOOKMAKER_PROFILE_NOT_FOUND'};
  const missing = p.fields.filter(f => f.required && !String(credentials?.[f.key] || '').trim()).map(f => f.key);
  return {ok:missing.length===0,missing,method:p.method,execution:p.execution};
}
