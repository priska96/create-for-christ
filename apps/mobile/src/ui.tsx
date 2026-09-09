import { useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { authClient } from './auth-client';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export function Page({title,subtitle,children}: {title:string;subtitle?:string;children:ReactNode}) {
  return <SafeAreaView style={ui.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.page}><Text style={ui.wordmark}>CREATE FOR CHRIST</Text><Text style={ui.title}>{title}</Text>{subtitle && <Text style={ui.body}>{subtitle}</Text>}{children}</ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export function Field({label,error,...props}: TextInputProps & {label:string;error?:string}) {
  return <View style={ui.field}><Text style={ui.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#778377" style={[ui.input,props.multiline && {minHeight:100,textAlignVertical:'top'}]} {...props}/>{error && <Text style={ui.error}>{error}</Text>}</View>;
}
export function Action({children,onPress,busy=false,secondary=false,disabled=false}: {children:string;onPress:()=>void;busy?:boolean;secondary?:boolean;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled:disabled||busy,busy}} disabled={disabled||busy} onPress={onPress} style={[ui.button,secondary && ui.secondary,(disabled||busy) && {opacity:.6}]}>{busy ? <ActivityIndicator color={secondary?'#36584A':'white'}/> : <Text style={[ui.buttonText,secondary && {color:'#36584A'}]}>{children}</Text>}</Pressable>;
}
export function Notice({message,error=false}: {message:string;error?:boolean}) {
  return message ? <Text accessibilityRole={error?'alert':undefined} accessibilityLiveRegion="polite" style={[ui.notice,error && ui.error]}>{message}</Text> : null;
}
export const ui = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#F7F5EF'},page:{width:'100%',maxWidth:600,alignSelf:'center',padding:24,paddingBottom:48,gap:16},
  wordmark:{fontSize:12,letterSpacing:2,color:'#527362',fontWeight:'700',marginVertical:8},title:{fontSize:32,lineHeight:38,fontWeight:'700',color:'#203B30'},
  body:{fontSize:15,lineHeight:24,color:'#627066'},field:{gap:8},label:{fontSize:14,fontWeight:'600',color:'#203B30'},
  input:{borderWidth:1,borderColor:'#CCD5C9',backgroundColor:'#FFFDF8',borderRadius:14,padding:15,fontSize:16,color:'#203B30'},
  button:{backgroundColor:'#36584A',borderRadius:14,padding:16,minHeight:52,alignItems:'center',justifyContent:'center'},
  secondary:{backgroundColor:'#E7EBDD'},buttonText:{color:'white',fontSize:15,fontWeight:'600'},error:{color:'#A33535',lineHeight:22},notice:{backgroundColor:'#EAEDE5',padding:14,borderRadius:12,color:'#36584A',lineHeight:23},
  row:{flexDirection:'row',gap:10},chip:{borderWidth:1,borderColor:'#C5D0C0',padding:12,borderRadius:14,flex:1,alignItems:'center'},selected:{backgroundColor:'#DDE8D5',borderColor:'#36584A'},
});

export function SignOutAction({disabled=false}:{disabled?:boolean}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function logout(){
    setBusy(true);setError('');
    try{const result=await authClient.signOut();if(result.error){setError('Abmelden fehlgeschlagen. Bitte erneut versuchen.');return;}router.replace('/');}
    catch{setError('Keine Verbindung. Bitte erneut versuchen.');}finally{setBusy(false);}
  }
  return <><Notice message={error} error/><Action secondary disabled={disabled} busy={busy} onPress={()=>void logout()}>Abmelden</Action></>;
}
