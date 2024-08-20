// cloudinary.provider.ts

import { v2 as cloudinary } from 'cloudinary';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    return cloudinary.config({    
        cloud_name:'dhdkmq1q8',
        api_key:'392267616758862',
        api_secret:
          'oNEMOMUuuyB0jGNvPAzgfB04ut0',
    });
  },
};
