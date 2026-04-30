export const environment = {
  production: true,
  debugLogging: false,
  version: '26.04.16.P', // Update this value as needed
  ordersRefreshIntervalSeconds: 20,
  slidecardRefreshIntervalSeconds: 30,
  useMockMenuApi: false,
  menuApiBaseUrl: 'https://api.getgogi.com/api/CMSDemo/Menu',
  ordersApiBaseUrl: 'https://api.getgogi.com/api/CMSDemo/Orders',
  ordersStatusChangeApiUrl: 'https://api.getgogi.com/api/CMSDemo/Orders/Update_OrderStatus',
  bingoSongsApiUrl: 'https://api.getgogi.com/api/Bingo/Bingo/Get_All_Songs',
  bingoPrintedCardsApiBaseUrl: 'https://api.getgogi.com/api/Bingo/Bingo/Get_Printed_Cards',
  bingoPrintedCardsByCardIdApiBaseUrl: 'https://api.getgogi.com/api/Bingo/Bingo/Get_Printed_Cards_byCardID',
  bingoClearCalledFlagsApiBaseUrl: 'https://api.getgogi.com/api/Bingo/Bingo/Clear_All_CalledFlags',
  bingoClearCalledSongsApiBaseUrl: 'https://api.getgogi.com/api/Bingo/Bingo/Clear_All_CalledSongs',
  bingoTopCardsApiBaseUrl: 'https://api.getgogi.com/api/Bingo/Bingo/Get_Top_Cards',
  bingoCallSongApiUrl: 'https://api.getgogi.com/api/Bingo/Bingo/Call_TheSongNumber',
  bingoCheckForWinnerApiBaseUrl: 'https://api.getgogi.com/api/Bingo/Bingo/Check_ForWinner',
  bingoCalledSongsApiUrl: 'https://api.getgogi.com/api/Bingo/Bingo/Get_Called_Songs',
  thumbnailApiBaseUrl: 'https://api.getgogi.com/api/ImageLoad/Images/Get_ThumbNail_Grid',
  thumbnailApprovalApiUrl: 'https://api.getgogi.com/api/ImageLoad/Images/Update_Image_Approval',
  thumbnailImageBaseUrl: 'https://api.getgogi.com/App_Data/UploadedImagesTN/',
  thumbnailFullImageBaseUrl: 'https://api.getgogi.com/App_Data/UploadedImages/',
  defaultLogin: 'admin', // Set your default login here
  defaultPassword: 'makemoney100' // Set your default password here
};
