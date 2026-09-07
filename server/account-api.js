import express from 'express';
import { createUser, authenticateUser, getSession, saveBookmakerToken, listBookmakerConnections, recordConnectionEvent, dbStatus } from './db/index.js';

const router = express.Router();
const BOOKMAKERS = ['sportybet','betmomo','premierbet','betpawa.cm','1xbet','1xwin','afropari'];
const CHANNELS = ['official_api','user_token','partner_sdk','browser_rpa','android_rpa','deeplink_coupon','authorized_gateway'];

function bearer(req){ return String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim(); }
async function userAuth(req,res,next){
  try {
    const session = await getSession(bearer(req));
    if(!session) return res.status(401).json({ok:false,error:'Session utilisateur invalide ou expirée.',code:'USER_SESSION_INVALID'});
    req.user = session;
    next();
  } catch(e) { return res.status(e?.status||503).json({ok:false,error:e?.message||'Base de données indisponible.',code:e?.code||'DATABASE_ERROR'}); }
}
function fail(res,e){ return res.status(e?.status||503).json({ok:false,error:e?.message||'Erreur serveur.',code:e?.code||'ACCOUNT_API_ERROR'}); }

router.get('/api/account/status', (req,res)=>res.json({ok:true,db:dbStatus(),bookmakers:BOOKMAKERS}));
router.post('/api/account/register', async(req,res)=>{
  try {
    const username=String(req.body?.username||'').trim().toLowerCase();
    const code=String(req.body?.code||'').trim();
    if(!/^[a-z0-9_.-]{3,40}$/.test(username)) return res.status(400).json({ok:false,error:'Nom utilisateur invalide.',code:'USERNAME_INVALID'});
    if(!/^\d{4}$/.test(code)) return res.status(400).json({ok:false,error:'Le code utilisateur doit contenir exactement 4 chiffres.',code:'CODE_INVALID'});
    const user=await createUser(username,code);
    res.status(201).json({ok:true,user:{id:user.id,username:user.username}});
  } catch(e){ fail(res,e); }
});
router.post('/api/account/login', async(req,res)=>{
  try {
    const username=String(req.body?.username||'').trim().toLowerCase();
    const code=String(req.body?.code||'').trim();
    const deviceId=String(req.body?.deviceId||'').trim().slice(0,160);
    if(!username||!/^\d{4}$/.test(code)) return res.status(400).json({ok:false,error:'Identifiants invalides.',code:'LOGIN_INVALID'});
    const result=await authenticateUser(username,code,deviceId||'unknown');
    if(!result) return res.status(401).json({ok:false,error:'Nom utilisateur ou code incorrect.',code:'LOGIN_FAILED'});
    res.json({ok:true,token:result.token,expiresAt:result.expiresAt,user:{id:result.user.id,username:result.user.username}});
  } catch(e){ fail(res,e); }
});
router.get('/api/account/me',userAuth,(req,res)=>res.json({ok:true,user:{id:req.user.user_id,username:req.user.username},expiresAt:req.user.expires_at}));
router.get('/api/account/bookmakers',userAuth,async(req,res)=>{
  try { res.json({ok:true,bookmakers:await listBookmakerConnections(req.user.user_id)}); } catch(e){ fail(res,e); }
});
router.post('/api/account/bookmakers/:slug/token',userAuth,async(req,res)=>{
  try {
    const slug=String(req.params.slug||'').trim().toLowerCase();
    const channel=String(req.body?.channel||'user_token').trim().toLowerCase();
    const token=String(req.body?.token||'').trim();
    const accountLabel=String(req.body?.accountLabel||'').trim().slice(0,120);
    if(!BOOKMAKERS.includes(slug)) return res.status(404).json({ok:false,error:'Bookmaker non supporté.',code:'BOOKMAKER_UNSUPPORTED'});
    if(!CHANNELS.includes(channel)) return res.status(400).json({ok:false,error:'Canal de connexion non supporté.',code:'CHANNEL_UNSUPPORTED'});
    if(!token) return res.status(400).json({ok:false,error:'Token bookmaker requis.',code:'BOOKMAKER_TOKEN_REQUIRED'});
    const saved=await saveBookmakerToken(req.user.user_id,slug,channel,token,accountLabel);
    await recordConnectionEvent(req.user.user_id,slug,'token_saved',true,{channel});
    res.status(201).json({ok:true,connection:saved});
  } catch(e){ fail(res,e); }
});

export { userAuth };
export default router;
