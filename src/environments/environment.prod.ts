export const environment = {
  production: true,
  debugLogging: false,
  version: '26.04.16.P', // Update this value as needed
  ordersRefreshIntervalSeconds: 20,
  useMockMenuApi: false,
  menuApiBaseUrl: 'https://api.getgogi.com/api/CMSDemo/Menu',
  ordersApiBaseUrl: 'https://api.getgogi.com/api/CMSDemo/Orders',
  ordersStatusChangeApiUrl: 'https://api.getgogi.com/api/CMSDemo/Orders/Update_OrderStatus',
  bingoSongsApiUrl: 'https://api.getgogi.com/api/Bingo/Bingo/Get_All_Songs',
  bingoPrintedCardsApiBaseUrl: 'https://api.getgogi.com/api/Bingo/Bingo/Get_Printed_Cards',
  thumbnailApiBaseUrl: 'https://api.getgogi.com/api/ImageLoad/Images/Get_ThumbNail_Grid',
  thumbnailApprovalApiUrl: 'https://api.getgogi.com/api/ImageLoad/Images/Update_Image_Approval',
  thumbnailImageBaseUrl: 'https://api.getgogi.com/App_Data/UploadedImagesTN/',
  thumbnailFullImageBaseUrl: 'https://api.getgogi.com/App_Data/UploadedImages/',
  defaultLogin: 'admin', // Set your default login here
  defaultPassword: 'makemoney100' // Set your default password here
};
