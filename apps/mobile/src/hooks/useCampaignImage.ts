import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { HTTP, IMAGE } from '@create-for-christ/contracts';
import { ApiError, uploadCampaignImage } from '../api';
import { useCampaignInvalidation } from './useCampaignQueries';
export function useCampaignImage() {
  const invalidate = useCampaignInvalidation();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: IMAGE.pickerQuality,
        allowsEditing: true,
        base64: true,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      if (!asset.base64)
        throw new ApiError(
          HTTP.badRequest,
          'Das Bild konnte nicht gelesen werden.'
        );
      if (asset.base64.length > IMAGE.maxBase64Length)
        throw new ApiError(
          HTTP.payloadTooLarge,
          'Das Bild darf höchstens 5 MB groß sein.'
        );
      if (!(IMAGE.mimeTypes as readonly string[]).includes(mimeType))
        throw new ApiError(
          HTTP.badRequest,
          'Bitte ein JPEG-, PNG- oder WebP-Bild auswählen.'
        );
      const updated = await uploadCampaignImage(campaignId, {
        mimeType,
        base64: asset.base64,
      });
      return updated;
    },
    onSuccess: (result) => {
      if (result) invalidate(result);
    },
  });
}
